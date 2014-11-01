Template.roomSubmit.events({
    'submit form': function(e) {
        e.preventDefault();

        var room = {
            name: $(e.target).find('[id=name]').val(),
            description: $(e.target).find('[id=desc]').val(),
            tags: $(e.target).find('[id=desc]').val(),
            guests: $(e.target).find('[id=desc]').val(),
            privacy: $(e.target).find('[name=my-checkbox0]').bootstrapSwitch('state'),
            scheduled: $(e.target).find('[name=my-checkbox]').bootstrapSwitch('state'),
            datetime: $(e.target).find('[id=datetimepicker1]').val(),
            chat: $(e.target).find('[name=my-checkbox1]').bootstrapSwitch('state')
        }

        Meteor.call('room', room, function(error, id) {
            if (error)
                return alert(error.reason);

            Router.go('roomPage', {_id: id});
        });
    }
});

Template.roomSubmit.rendered = function() {
    var my_custom_options = {
        "no-duplicate": true,
        "no-duplicate-callback": window.alert,
        "no-duplicate-text": "Duplicate tags",
        "type-zone-class": "type-zone",
        "tag-box-class": "tagging",
        "forbidden-chars": [",", "?"]
    };
    var t = $("#roomtags").tagging(my_custom_options);
    t[0].addClass("form-control");

    var t1 = $("#invites").tagging(my_custom_options);
    t1[0].addClass("form-control");

    $('#datetimepicker1').datetimepicker();
    $("[name='my-checkbox']").bootstrapSwitch('size', 'mini', 'mini');
    $("[name='my-checkbox0']").bootstrapSwitch('size', 'mini', 'mini');
    $("[name='my-checkbox1']").bootstrapSwitch('size', 'mini', 'mini');
};
