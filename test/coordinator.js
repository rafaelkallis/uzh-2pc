
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');

const Coordinator = require('../coordinator');
const Subordinate = require('../subordinate');

const assert = require('assert');
const http = require('http');

const constants = require('../constants.js');

const endpoint = 'http://localhost:8080';

let coordinator = new Coordinator(8080);
let sub = new Subordinate('subordinate', endpoint);

function rmdir(dir) {
  return fs.readdirAsync(dir)
    .then(files => 
      Promise.all(
        files.map(file => {
          file = path.join(dir, file);

          return fs.statAsync(file)
            .then(stats => stats.isDirectory() ? rmdir(file) : fs.unlinkAsync(file));
      })))
    .then(() => fs.rmdirAsync(dir))
}

describe('Coordinator', () => {
  before(done => {
    coordinator.start(done);
    sub.start();
  });

  beforeEach(done => {
    rmdir('logs')
      .then(() => fs.mkdirAsync('logs'))
      .then(done);
  })

  it('Prepares subordinators', (done) => {
    http.request(endpoint, () => {
      coordinator.log.readLog()
        .then(logs => logs.some(log => log.type === constants.COMMIT))
        .then(hasPrepare => hasPrepare && done())
        .catch(err => done(err));
    }).end();
  });

  it('Commits subordinators', (done) => {
    http.request(endpoint, () => {
      coordinator.log.readLog()
        .then(logs => logs.some(log => log.type === constants.COMMIT))
        .then(hasPrepare => hasPrepare && done())
        .catch(err => done(err));
    }).end();
  });
});