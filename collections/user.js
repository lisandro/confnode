Meteor.users.helpers = {
    addVisitedRoom: function(userId, roomId) {
        var user;
        var room = Rooms.find({
            _id: roomId
        }, {
            limit: 1,
            fields: {
                _id: 0,
                tags: 1
            }
        });
        if (room.count() === 0) {
            throw new Meteor.Error(422, 'Room does not exist');
        }

        user = Meteor.users.find({
            $and: [{
                _id: userId
            }, {
                'profile.visitedRooms': {
                    $elemMatch: {
                        room_id: roomId
                    }
                }
            }]
        }, {
            limit: 1
        });

        // If user has not visited this room before.
        if (user.count() === 0) {
            var visitDate = new Date();
            Meteor.users.update({
                _id: userId
            }, {
                $push: {
                    'profile.visitedRooms': {
                        when: visitDate,
                        room_id: roomId
                    }
                }
            });

            Rooms.update({
                _id: roomId
            }, {
                $inc: {
                    visits: 1
                }
            });

            // Relate user to room tags.
            room.fetch()[0].tags.forEach(function(tag) {
                Meteor.call('sendPioEvent', userId, tag, visitDate);
            });
        }
    }
};

Meteor.methods({
    userAddVisitedRoom: function(roomId) {
        Meteor.users.helpers.addVisitedRoom(Meteor.userId(), roomId);
    },

    userUpdate: function(user) {
        validateUser(user);

        Meteor.users.update({
            _id: Meteor.userId()
        }, {
            $set: user
        });
    },

    searchInterestedGuests: function(topics, limit) {
        topics = _.map(topics, function(t) {
            return new RegExp('^' + t, 'i');
        });

        /**
         * We find in users collection if some of the topics
         * are present in their interests or skills
         * @type {Array}
         */
        var users = Meteor.users.find({
            $or: [{
                'profile.interests': {
                    $in: topics
                }
            }, {
                'profile.skills': {
                    $in: topics
                }
            }]
        }, {
            '_id': 0,
            'emails': 1,
            'profile.skills': 1,
            'profile.interests': 1,
            'visitedRooms': 1
        }).fetch();


        for (var user in users) {
            user = users[user];
            var skillsMatches = 0;
            var interestsMatches = 0;
            var skills = user.profile.skills;
            var interests = user.profile.interests;
            var matches = [];
            user.profile.visitedRooms = user.profile.visitedRooms.length;
            for (var topic in topics) {
                topic = topics[topic];
                var abort = false;

                /**
                 * We want to know how many matches were in skills, then
                 * we analyze where the query match better for the current user and define
                 * the percentage of similarity
                 */
                if (typeof skills !== "undefined") {
                    for (var skill in skills) {
                        if (skills[skill].match(topic)) {
                            skillsMatches++;
                            abort = true;
                            break;
                        }
                    }
                }
                /**
                 * Know the matches in interest with the same goal that Skills
                 *
                 */
                if (typeof interests !== "undefined" && !abort) {
                    for (var interest in interests) {
                        if (interests[interest].match(topic)) {
                            interestsMatches++;
                            break;
                        }
                    }
                }

                user.similarity = skillsMatches + interestsMatches / topics.length;

                /**
                 * Calc a coefficient to sort the results, based on similarity as the most
                 * important information and taking into consideration the number of
                 * visited rooms with the purpose of known if user is a frequent guest/user
                 * @type {number}
                 */
                user.interestCoefficient = user.profile.visitedRooms * Math.sqrt(user.similarity);
            }
        }

        if (typeof limit === "undefined" || limit < 0) {
            limit = users.length;
        }

        return _.chain(users)
            .sortBy('interestCoefficient')
            .reverse()
            .map(function(u) {
                return u.emails[0].address;
            })
            .slice(0, limit)
            .value();
    }
});

var validateUser = function(user) {
    check(user, {
        'profile.fullname': String,
        'profile.company': String,
        'profile.location': String,
        'profile.about': String,
        'profile.skills': Array,
        'profile.interests': Array,
        'profile.availability': Array,
        'profile.timezone': String
    });
};