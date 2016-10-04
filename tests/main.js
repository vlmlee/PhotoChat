'use strict';
var expect = require('chai').expect;
var Server = require('../server/socketServer.js');

describe('', () => {
	it('should be', () => {
		var someFunction = Server.function('some arg');
		expect(someFunction).to.equal(expectedResult);
	});
});
