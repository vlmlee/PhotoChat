'use strict';
var expect = require('chai').expect,
    Server = require('../server/socketServer.js'),
    rooms = Server.rooms,
    Client = require('../public/javascripts/socketClient.js');

describe('Picture Chat', () => {

    describe('User Info', () => {
        it('generates a random string for the room ID', () => {
        	expect(Server.randomString()).to.be.a('string').with.length(8);
        });
    });

    describe('Chat room behavior', () => {

        it('joins the room if there are less than 2 people', () => {

        	Server.createRoom(testSocket, 'Michael');
        	expect(Server.rooms).to.be({['Michael']});
        });

        it('limits the room to 2 people', () => {
        	expect(Server.findAndJoinAvailableRoom(testSocket, 'Poppy')).to.be({['Michael', 'Poppy']});
        	expect(rooms).to.have.length(1);
        	expect(rooms[0]).to.have.length(2);
        });

        it('returns the other user in the room', () => {
            Server.findAndJoinAvailableRoom('Michael');
            expect().to.equal(expectedResult);
        });

        it('creates another room if the room is full', () => {
        	Server.findAndJoinAvailableRoom(testSocket, 'Leiane');
        	expect(rooms).to.have.equal(2);
        });

        it('deletes room if room is empty', () => {
        	Server.removeParticipant('Leiane');
        	expect(rooms).to.deep.equal({['Michael', 'Poppy']});
        });

        it('retrieves name of user already in room', () => {
        	Server.retrieveName('Michael', roomName);
        	expect(rooms[0]).to.equal('Poppy');
        });
    });

});