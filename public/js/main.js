$(document).ready(function() {
  var tabFocused = false;
  var socket = io.connect();

  socket.on('connect', function() {
    console.log('Connected with socket.io');
  });

  socket.on('flood', function() {
    Notifier.warning('Please don\'t flood');
    textfield.attr('disabled', true);
    setTimeout(function() {
      textfield.attr('disabled', false);
    }, 10000);
  });

  socket.on('online', function(users) {
    for (var i = 0, l = users.length; i < l; i++) {
      enter(users[i]);
    }
  });

  socket.on('messages', function(messages) {
    for (var i = 0, l = messages.length; i < l; i++) {
      msg(messages[i]);
    }
  });

  var onlineUsersUL = $('#online-users');
  var onlineUsers = [];
  function enter(user) {
    var li = $('<li>').text(user);
    li.appendTo(onlineUsersUL);
    var len = onlineUsers.push({ user: user, el: li });
    if (len % 2 === 0) li.addClass('stripe');
  }
  
  var n = 1;
  function msg(data) {
    var children = chat.children();
    if (children.length === 50) {
      children.first().remove();
    }

    var row = $('<tr>')
      .append($('<td>').addClass('user').text(data.user))
      .append($('<td>').addClass('msg').text(data.msg))

    if (n++ % 2 === 0) row.addClass('stripe');
    row.appendTo(chat)

    chatContainer.scrollTop(chatContainer[0].scrollHeight);
  }

  var chatContainer = $('#chat');
  var chat = $('#chat tbody');
  var newMessages = 0;
  Tinycon.setOptions({
    width: 7,
    height: 9,
    font: '10px arial',
    colour: '#ffffff',
    background: '#549A2F',
    fallback: true
  });

  socket.on('msg', function(m) {
    if (!tabFocused) {
      Tinycon.setBubble(++newMessages);
    }
    msg(m);
  });

  socket.on('enter', enter);

  socket.on('leave', function(user) {
    var found = false;

    for (var i = 0, l = onlineUsers.length; i < l; i++) {
      var u = onlineUsers[i];

      if (!found) {
        if (u.user === user) {
          onlineUsers.splice(i--, 1);
          u.el.remove();
          found = true;
        }
      } else {
        u.el.toggleClass('stripe');
      }
    }
  });


  var textfield = $('#msg');
  var nameset = false;

  function clear() {
    textfield.val('');
    textfield.unbind('focus', clear);
  }

  textfield.focus();
  textfield.bind('focus', clear);

  textfield.on('keydown', function(e) {
    if (e.keyCode !== 13) return;
    var val = textfield.val().replace(/(^\s+|\s$)/, '');
    if (!val) return;

    if (nameset) {
      val = val.substring(0, 200);
      socket.emit('msg', val);

    } else {
      val = val.substring(0, 20);
      socket.emit('name', val);
      nameset = true;
    }

    textfield.val('');
  });

  $(window).blur(function() {
    tabFocused = false;
  });

  $(window).focus(function() {
    tabFocused = true;
    textfield.focus();
    if (newMessages > 0) {
      newMessages = 0;
      Tinycon.reset();
    }
  });

  function onmouseover() {
    tabFocused = true;
    $(window).off('mouseover', onmouseover);
  }
  $(window).on('mouseover', onmouseover);
});
