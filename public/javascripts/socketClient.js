var socket = io(),
    badWords = require('badwords-list'),
    badWordsRegex = badWords.regex,
    badWordsList = badWords.array;

var name,
    typing,
    lastTypingTime;

var $loginName = $('#loginName'),
    $loginPage = $('#loginPage'),
    $errorMessage = $('.errorMessage'),
    $chatBody = $('#chatBody'),
    $chatMessages = $('#chatMessages'),
    $inputMessage = $('#inputMessage'),
    $stranger = $('.stranger'),
    $user = $('.user'),
    $bubbleRight = $('#quoteBubble-right'),
    $bubbleLeft = $('#quoteBubble-left'),
    $window = $(window);

socket.on('user joined', (user) => {
    $chatMessages.append('<div class="messages systemMessage">' + user.name + ' has joined the room.</div>');
    if ($stranger.html() === '') {
        socket.emit('retrieve stranger name');
    }
});

socket.on('user left', (user) => {
    $chatMessages.append('<div class="messages systemMessage">' + user.name + ' has left the room.</div>');
    $stranger.html('');
});

socket.on('set user name', (user) => {
    $user.append(user.name);
});

socket.on('set stranger name', (stranger) => {
    $stranger.append(stranger.name);
});

socket.on('stranger typing', () => {
    setTimeout(() => {
        $bubbleRight.css({
            'visibility': 'visible'
        }).hide().fadeTo(300, 1);
    }, 500);
});

socket.on('stranger stopped typing', () => {
    setTimeout(() => {
        $bubbleRight.fadeTo(300, 0, () => {
            $bubbleLeft.css({ 'visibility': 'hidden' });
        });
    }, 500);
});

socket.on('stranger message', (stranger) => {
    $('<div class="messages strangerMessage">' + stranger.message + '</div><div class="bubbleBottom-stranger"></div>')
        .hide()
        .appendTo($chatMessages)
        .fadeIn(400);
    $chatMessages[0].scrollTop = $chatMessages[0].scrollHeight;
});

$inputMessage.on('input', () => {
    updateTyping();
});

function updateTyping() {
    if (!typing) {
        typing = true;
        socket.emit('typing');
        setTimeout(() => {
            $bubbleLeft.css({
                'visibility': 'visible'
            }).hide().fadeTo(300, 1);
        }, 500);
    }
    lastTypingTime = (new Date()).getTime();
    setTimeout(() => {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= 500 && typing) {
            socket.emit('stop typing');
            $bubbleLeft.fadeTo(300, 0, () => {
                $bubbleLeft.css({ 'visibility': 'hidden' });
            });
            typing = false;
        }
    }, 1000);
}

$window.keydown((event) => {
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
        $loginName.focus();
    }
    if (event.which === 13) {
        if (name) {
            sendMessage();
        } else {
            setName();
        }
    }
});

function sendMessage() {
    var message = $inputMessage.val();
    message = cleanInput(message, true);
    if (message) {
        $inputMessage.val('');
        addChatMessage({
            name: name,
            message: message
        });
        socket.emit('new message', {
            name: name,
            message: message
        });
    }
}

function addChatMessage(user) {
    $('<div class="messages userMessage">' + user.message + '</div><div class="bubbleBottom-user"></div>')
        .hide()
        .appendTo($chatMessages)
        .fadeIn(400);
    $chatMessages[0].scrollTop = $chatMessages[0].scrollHeight;
}

function setName() {
    name = cleanInput($loginName.val().trim());
    if (name) {
        $loginPage.css({
            'animation': 'slideUp 1.5s ease forwards'
        });
        $chatBody.show();
        socket.emit('add user', name);
    } else {
        $errorMessage.html('Error: please choose a different name.');
        name = '';
    }
}

function cleanInput(inputVal, message) {
    if (message) {
        return $('<div />').text(inputVal).text();
    }

    if (inputVal.match(badWordsRegex) || containsBadWord(inputVal)) {
        return '';
    } else {
        return $('<div />').text(inputVal).text();
    }
}

function containsBadWord(inputStr) {
    var substring = '';
    for (var i = 0; i < inputStr.length; i++) {
        substring += inputStr[i];
        if (badWordsList.indexOf(substring) != -1) {
            return true;
        }
    }
    return false;
}
