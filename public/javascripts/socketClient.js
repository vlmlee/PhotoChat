/*
 * =======================================
 *           Picture Chat v1.0.0
 * =======================================
 *  https://github.com/vlmlee/PictureChat
 * =======================================
 *     Created by Michael Lee (vlmlee)
 *            www.corollari.com
 *    This project is available as open 
 *    source software under the MIT 
 *    License.


 * =======================================
 *               VARIABLES
 * =======================================
 */

var socket = io(),
    badWords = require('badwords-list'),
    badWordsRegex = badWords.regex,
    badWordsList = badWords.array;

var name,
    typing,
    lastTypingTime,
    textChat = true,
    pictureChat = false,
    canvas = false;

// DOM elements
var $loginName = $('#loginName'),
    $loginPage = $('#loginPage'),
    $errorMessage = $('.errorMessage'),
    $chatError = $('#chatError'),
    $chatBody = $('#chatBody'),
    $chatMessages = $('#chatMessages'),
    $inputMessage = $('#inputMessage'),
    $textChatButton = $('#textChatButton'),
    $pictureChatButton = $('#pictureChatButton'),
    $canvasChatButton = $('#canvasChatButton'),
    $stranger = $('.stranger'),
    $user = $('.user'),
    $bubbleRight = $('#quoteBubble-right'),
    $bubbleLeft = $('#quoteBubble-left'),
    $window = $(window);

/*
 * =======================================
 *              SOCKET EVENTS
 * =======================================
 *    Clients are distinguished between 
 *    "users" and "strangers". Clients
 *    will see themselves as "users" and
 *    other socket connections as 
 *    "strangers".
 */

socket.on('user joined', (user) => {
    $chatMessages.append('<div class="messages systemMessage">' + user.name + ' has joined the room.</div>');

    // If a user joins an already occupied room,
    // we will retrieve the name of the other
    // participant and set it.
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
    addChatMessage(stranger);
});

/* 
 * =======================================
 *                SET NAME
 * =======================================
 */

function setName() {
    name = cleanInput($loginName.val().trim());
    if (name) {
        $loginPage.css({
            'animation': 'slideUp 1.5s ease forwards'
        });
        // The chat body is initially hidden to (soft) protect access 
        // without a name.
        $chatBody.show();
        socket.emit('connect to chat', name);
    } else {
        $errorMessage.html('Error: please choose a different name.');
        name = '';
    }
}

/* 
 * =======================================
 *               USER INPUT
 * =======================================
 */

$inputMessage.on('input', () => {
    updateTyping();
});

$window.keydown((event) => {
    // Any key press will autofocus on the login field
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
        $loginName.focus();
    }
    // event.which === 13 is the "enter key" event.
    if (event.which === 13) {
        if (name) {
            if (textChat) {
                sendTextMessage();
            } else if (pictureChat) {
                sendPictureMessage();
            } else {
                canvas;
            }
        } else {
            setName();
        }
    }
});

/*
 * =======================================
 *             SANITIZE INPUT
 * =======================================
 */

function cleanInput(inputVal, message) {
    if (message) {
        return $('<div />').text(inputVal).text();
    }

    if (inputVal.match(badWordsRegex) || containsBadWord(inputVal)) {
        $chatError.html("Error: please don't use bad words!");
        return '';
    } else {
        $chatError.html('');
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

/*
 * =======================================
 *           TOGGLE MESSAGE TYPE
 * =======================================
 */

$textChatButton.on('click', (e) => {
    e.preventDefault();
    textChat = true,
        pictureChat = false,
        canvas = false;
    $inputMessage.css({
        'text-align': 'left'
    }).attr('placeholder', 'Send message...');
});

$pictureChatButton.on('click', (e) => {
    e.preventDefault();
    textChat = false,
        pictureChat = true,
        canvas = false;
    $inputMessage.css({
        'text-align': 'center'
    }).attr('placeholder', 'Type in a single word...');
});

$canvasChatButton.on('click', (e) => {
    e.preventDefault();
    textChat = false,
        pictureChat = false,
        canvas = true;
});

/*
 * =======================================
 *               MESSAGING
 * =======================================
 */

function sendTextMessage() {
    var message = $inputMessage.val();
    message = cleanInput(message, true);
    if (message) {
        $inputMessage.val('');
        addChatMessage({
            id: 'user',
            type: 'text',
            class: 'userMessage',
            message: message
        });
        socket.emit('send message', {
            id: 'stranger',
            type: 'text',
            class: 'strangerMessage',
            message: message
        });
    }
}

function sendPictureMessage(user) {
    var keyword = $inputMessage.val();
    keyword = cleanInput(keyword, false);

    if (keyword) {
        $.getJSON("http://api.flickr.com/services/feeds/photos_public.gne?jsoncallback=?", {
            tags: keyword,
            tagmode: "any",
            format: "json"
        }, (data) => {
            var rnd = Math.floor(Math.random() * data.items.length);
            var pictureSrc = data.items[rnd]['media']['m'].replace("_m", "_b");
            var message = '<img class="picture" src="' + pictureSrc + '"/>';
            $inputMessage.val('');
            addChatMessage({
                id: 'user',
                type: 'picture',
                class: 'userMessage',
                message: message
            });
            socket.emit('send message', {
                id: 'stranger',
                type: 'picture',
                class: 'strangerMessage',
                message: message
            });
        });
    }
}

function addChatMessage(user) {
    $('<div class="messages ' + user.class + '">' + user.message + '</div><div class="bubbleBottom-' + user.id + '"></div>')
        .hide()
        .appendTo($chatMessages)
        .fadeIn(400);

    if (user.type === 'picture') {
        $chatMessages.animate({ scrollTop: $chatMessages[0].scrollHeight }, 1000);
    } else if (user.type === 'text') {
        $chatMessages[0].scrollTop = $chatMessages[0].scrollHeight;
    }
}

/*
 * =======================================
 *            TYPING ANIMATION
 * =======================================
 */

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
