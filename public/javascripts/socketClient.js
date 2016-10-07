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
    $canvasError = $('#canvasError'),
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

// canvas
var canvas = document.getElementById('drawingBody'),
    $drawingBody = $('#drawingBody'),
    context;

var mouse = {
    click: false,
    move: false,
    pos: {
        x: 0,
        y: 0
    },
    posPrevious: false
};

var width = window.innerWidth,
    height = window.innerHeight;

canvas.setAttribute('width', 730);
canvas.setAttribute('height', 500);

/*
 * =======================================
 *                 CANVAS
 * =======================================
 */

if (canvas.getContext('2d')) {
    context = canvas.getContext('2d');
} else {
    $canvasError.html('Canvas is not supported on this browser.');
}

canvas.onmousedown = function(e) {
    mouse.click = true;
}

canvas.onmouseup = function(e) {
    mouse.click = false;
}

canvas.onmousemove = function(e) {
    mouse.pos.x = e.clientX - this.offsetLeft;
    mouse.pos.y = e.clientY - this.offsetTop;
    mouse.move = true;
}

function drawLoop(user) {
    if (mouse.click && mouse.move && mouse.posPrevious) {
        socket.emit('draw', {
            name: name,
            line: [mouse.pos, mouse.posPrevious]
        });
        mouse.move = false;
    }
    mouse.posPrevious = { x: mouse.pos.x, y: mouse.pos.y };

    if (canvas) {
        setTimeout(() => {
            drawLoop();
        }, 25);
    }
}

function midpoint(p1, p2) {
    return {
        x: p1.x + (p2.x - p1.x) / 2,
        y: p1.y + (p2.y - p1.y) / 2
    };
}

// window.addEventListener('resize', resizeCanvas);
// function resizeCanvas() {
//     width = window.innerHeight;
//     height = window.innerHeight;
//}

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

socket.on('draw on canvas', (data) => {
    if (data.name === name) {
        context.strokeStyle = '#3299CC';
    } else {
        context.strokeStyle = '#ED4337';
    }

    var line = data.line;
    var x1 = line[0].x;
    var y1 = line[0].y;
    var x2 = line[1].x;
    var y2 = line[1].y;
    var mp = midpoint(line[0], line[1]);

    context.beginPath();
    context.lineWidth = 3;
    context.lineJoin = context.lineCap = 'round';
    context.moveTo(x1, y1);
    context.quadraticCurveTo(mp.x, mp.y, x2, y2);
    context.stroke();
});

socket.on('clear canvas', () => {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height)
    $inputMessage.val('');
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
        $errorMessage.html('Please choose a different name.');
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
        $inputMessage.focus();
    }
    // event.which === 13 is the "enter key" event.
    if (event.which === 13) {
        if (name) {
            if (textChat) {
                sendTextMessage();
            } else if (pictureChat) {
                sendPictureMessage();
            } else if (canvas && ($inputMessage.val() === 'clear')) {
                socket.emit('clear canvas');
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

function cleanInput(inputVal, text) {
    if (text) {
        $chatError.html('');
        return $('<div />').text(inputVal).text();
    }
    if (inputVal.match(badWordsRegex) || containsBadWord(inputVal)) {
        $chatError.html("Please don't use bad words!");
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
    $drawingBody.hide();
    $chatMessages.show();
    $inputMessage.css({
        'text-align': 'left'
    }).attr('placeholder', 'Send message...');
});

$pictureChatButton.on('click', (e) => {
    e.preventDefault();
    textChat = false,
        pictureChat = true,
        canvas = false;
    $drawingBody.hide();
    $chatMessages.show();
    $inputMessage.css({
        'text-align': 'center'
    }).attr('placeholder', 'Type in a single word...');
});

$canvasChatButton.on('click', (e) => {
    e.preventDefault();
    textChat = false,
        pictureChat = false,
        canvas = true;
    $chatMessages.hide();
    $drawingBody.css({
        display: 'block'
    });
    drawLoop();
    $inputMessage.css({
        'text-align': 'center'
    }).attr('placeholder', "Type 'clear' to clear the canvas...");
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
