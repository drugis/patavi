'use strict';
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const chai = require('chai');
const spies = require('chai-spies');

chai.use(spies);
const expect = chai.expect;

const startupCheckServiceStub = {
  checkDBConnection: chai.spy(),
  checkCertificates: chai.spy(),
  checkRabbit: chai.spy()
};

const startupDiagnosticsService = proxyquire(
  '../startupDiagnosticsService', {
  './startupCheckService': () => { return startupCheckServiceStub; },
  './dbUtils': () => { return {}; }
});

describe('the startup diagnostics service', () => {
  describe('runStartupDiagnostics', () => {
    var checkDB;
    var checkCertificates;
    var checkRabbit;
    const errorHeader = '<h3>Patavi server could not be started. The following errors occured:</h3>';
    const divStart = '<div style="padding: 10px">';
    const divEnd = '</div>';
    const pataviError = 'patavi connection error';
    const dbError = 'db connection error';
    var rabbitError = 'rabbit error';

    beforeEach(() => {
      checkDB = sinon.stub(startupCheckServiceStub, 'checkDBConnection');
      checkCertificates = sinon.stub(startupCheckServiceStub, 'checkCertificates');
      checkRabbit = sinon.stub(startupCheckServiceStub, 'checkRabbit');
    });

    afterEach(() => {
      checkDB.restore();
      checkCertificates.restore();
      checkRabbit.restore();
    });

    it('should call the callback without errors', (done) => {
      checkDB.onCall(0).yields(null, []);
      checkCertificates.onCall(0).yields(null, []);
      checkRabbit.onCall(0).yields(null, []);
      var callback = function(errors) {
        expect(errors).to.equal(undefined);
        done();
      };

      startupDiagnosticsService.runStartupDiagnostics(callback);
    });

    it('should call the callback with a certificate error', (done) => {
      checkDB.onCall(0).yields(null, []);
      checkCertificates.onCall(0).yields(null, [pataviError]);
      checkRabbit.onCall(0).yields(null, []);
      var expectedError = errorHeader + divStart + pataviError + divEnd;
      var callback = function(errors) {
        expect(errors).to.equal(expectedError);
        done();
      };

      startupDiagnosticsService.runStartupDiagnostics(callback);
    });

    it('should call the callback with a DB connection error', (done) => {
      checkDB.onCall(0).yields(null, [dbError]);
      checkCertificates.onCall(0).yields(null, []);
      checkRabbit.onCall(0).yields(null, []);
      var expectedError = errorHeader + divStart + dbError + divEnd;
      var callback = function(errors) {
        expect(errors).to.equal(expectedError);
        done();
      };

      startupDiagnosticsService.runStartupDiagnostics(callback);
    });

    it('should call the callback with DB, certificate error, and rabbit errors', (done) => {
      checkDB.onCall(0).yields(null, [dbError]);
      checkCertificates.onCall(0).yields(null, [pataviError]);
      checkRabbit.onCall(0).yields(null, [rabbitError]);
      var expectedError = errorHeader +
        divStart + dbError + divEnd +
        divStart + pataviError + divEnd +
        divStart + rabbitError + divEnd;
      var callback = function(errors) {
        expect(errors).to.equal(expectedError);
        done();
      };

      startupDiagnosticsService.runStartupDiagnostics(callback);
    });

    it('should call the callback with an error if the parallel execution goes wrong', (done) => {
      var error = 'parallel error';
      checkDB.onCall(0).yields(null, []);
      checkCertificates.onCall(0).yields(error, []);
      checkRabbit.onCall(0).yields(null, []);
      var expectedError = errorHeader +
        divStart + 'Could not execute diagnostics, unknown error: ' + error + divEnd;
      var callback = function(errors) {
        expect(errors).to.equal(expectedError);
        done();
      };

      startupDiagnosticsService.runStartupDiagnostics(callback);
    });
  });

});
