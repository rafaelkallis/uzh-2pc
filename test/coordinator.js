
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const uuid = require('node-uuid').v4;

const Coordinator = require('../coordinator');
const Subordinate = require('../subordinate');

const errors = require('../errors');
const PrepareNoVoteError = errors.PrepareNoVoteError;

const assert = require('assert');
const http = require('http');

const constants = require('../constants.js');

const endpoint = 'http://localhost:8080';

let coordinator = new Coordinator(8080);
let sub = new Subordinate('subordinate', endpoint);

let transaction = {
  id: uuid(),
  payload: `some payload`
};

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
    coordinator._prepare_mediators(transaction)
      .then(() => done())
      .catch(done);
  });

  it('Commits subordinators', (done) => {
    coordinator._prepare_mediators(transaction)
      .catch(() => { })
      .then(() => coordinator._commit_mediators(transaction))
      .then(() => done())
      .catch(done);
  });

  it('Aborts on NO response', (done) => {
    let bugTransaction = { id: transaction.id, payload: constants.BUG_NO };
    coordinator._prepare_mediators(bugTransaction)
      .then(() => done(new Error(`No response should end up in a catch!`)))
      .catch(PrepareNoVoteError, () => done());
  });

  it('Retries on subordinator crash', function (done) {
    this.timeout(5000);
    sub.stop();

    setTimeout(() => sub.start(), 1000);

    coordinator._commit_mediators(transaction)
      .then(() => done())
      .catch(done);
  });
});