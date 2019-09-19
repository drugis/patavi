'use strict';
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const chai = require('chai');
const spies = require('chai-spies');
const fs = require('fs');
const https = require('https');
const amqp = require('amqplib/callback_api');

chai.use(spies);
const expect = chai.expect;

const dbStub = {
  query: () => { }
};

const startupCheckService = proxyquire(
  '../startupCheckService', {})(dbStub);

describe('the startup check service', () => {
  describe('checkDBConnection', () => {
    var query;

    beforeEach(() => {
      query = sinon.stub(dbStub, 'query');
    });

    afterEach(() => {
      query.restore();
    });

    it('should call the callback with an empty array if there are no errors', () => {
      var callback = chai.spy();
      query.onCall(0).yields(null);
      startupCheckService.checkDBConnection(callback);
      expect(callback).to.have.been.called.with(null, []);
    });

    it('should call the callback with an array containting error messages', () => {
      var dbError = 'db error';
      var expectedErrorMessage = 'Connection to database unsuccessful. <i>' + dbError + '</i>.<br> Please make sure the database is running and the environment variables are set correctly.';
      var callback = chai.spy();
      query.onCall(0).yields('db error');
      startupCheckService.checkDBConnection(callback);
      expect(callback).to.have.been.called.with(null, [expectedErrorMessage]);
    });
  });

  describe('checkCertificates', () => {
    var existsSync;
    var httpsRequest;

    beforeEach(() => {
      existsSync = sinon.stub(fs, 'existsSync');
      httpsRequest = sinon.stub(https, 'request');
    });

    afterEach(() => {
      existsSync.restore();
      httpsRequest.restore();
    });

    it('should call the callback with an empty array if there are no errors', () => {
      var callback = chai.spy();
      existsSync.returns(true);

      startupCheckService.checkCertificates(callback);
      expect(callback).to.have.been.called.with(null, []);
    });

    it('should call the callback with certificate errors', () => {
      var callback = chai.spy();
      existsSync.returns(false);

      startupCheckService.checkCertificates(callback);

      var expectedError1 = 'Patavi server key not found. Please make sure it is accessible at the specified location.';
      var expectedError2 = 'Patavi server certificate not found. Please make sure it is accessible at the specified location.';
      var expectedError3 = 'Patavi certificate authority not found. Please make sure it is accessible at the specified location.';
      expect(callback).to.have.been.called.with(null, [expectedError1, expectedError2, expectedError3]);
    });
  });

  describe('checkRabbit', () => {
    var connect;

    beforeEach(() => {
      connect = sinon.stub(amqp, 'connect');
    });

    afterEach(() => {
      connect.restore();
    });

    it('should call the callback with an empty array if patavi can connect with the rabbit', () => {
      var callback = chai.spy();
      connect.onCall(0).yields(null);

      startupCheckService.checkRabbit(callback);
      expect(callback).to.have.been.called.with(null, []);
    });

    it('should call the callback with an error if patavi cant connect with the rabbit', () => {
      var callback = chai.spy();
      const error = 'rabbit error';
      connect.onCall(0).yields(error);

      startupCheckService.checkRabbit(callback);
      const expectedError = 'AMQP connection to Rabbit unsuccessful. <i>' + error + '</i>.<br> Please make sure the Rabbit is running and the environment variables are set correctly.';
      expect(callback).to.have.been.called.with(null, [expectedError]);
    });
  });
});
