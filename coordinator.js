/**
 * Created by rafaelkallis on 03.11.16.
 */
const Promise = require('bluebird');
const express = require('express');
const socket_server = require('socket.io');
const http = require('http');
const uuid = require('node-uuid').v4;
const SubordinateMediator = require('./mediator').SubordinateMediator;
const Log = require('./log');
// const node_persist = require('node-persist');

/**
 * Constants
 */
const errors = require('./errors');
const constants = require('./constants');
const DisconnectedError = errors.DisconnectedError;
const ACKError = errors.ACKError;
const PrepareNoVoteError = errors.PrepareNoVoteError;
const SUCCESS_MSG = constants.SUCCESS_MSG;
const FAIL_MSG = constants.FAIL_MSG;

class Coordinator {
    constructor(port) {
        this._app = express();
        this._port = port;
        // this._commit_cache = node_persist;
        // this._abort_cache = node_persist;
        // this._subordinate_cache = node_persist;
        this._subordinate_mediators_map = {}; // sub_id -> sub_med
        this._disconnected = new Set(); // sub_id
        this.log = new Log("Coordinator");

    }

    _prepare_mediators(payload) {
        return Promise.all(this._subordinate_mediators.map(sub_med => sub_med.prepare(payload)));
    }

    _commit_mediators(payload) {
        let attempt = 0;


        return Promise.all(this._subordinate_mediators.map(sub_med => new Promise(resolve => (function retry() {
            if(attempt > 0)
                console.log(`Retrying commit on subordinator ${sub_med.subordinate_id}.`);
                
            sub_med.commit(payload)
                .then(resolve)
                .catch(ACKError, (error) => setTimeout(retry, Coordinator._exponential_backoff(++attempt)));
        })())));
    }

    _abort_mediators(payload) {
        let attempt = 0;
        return Promise.all(this._subordinate_mediators.map(sub_med => new Promise(resolve => (function retry() {
            sub_med.abort(payload)
                .then(resolve)
                .catch(ACKError, (error) => setTimeout(retry, Coordinator._exponential_backoff(++attempt)));
        })())));
    }

    _disconnect_check() {
        return new Promise((resolve, reject) => this._disconnected.size == 0 ? resolve() : reject(new DisconnectedError()));
    }

    static _exponential_backoff(attempt) {
        return 500 * Math.pow(2, attempt);
    }

    get _subordinate_mediators() {
        return Object.keys(this._subordinate_mediators_map).map(sub_id => this._subordinate_mediators_map[sub_id]);
    }

    stop() {
        this._socket_server.close();
        console.log('stopped');
    }

    start(callback = () => ({})) {
        this._server = http.Server(this._app);
        this._socket_server = socket_server(this._server);

        this._app.get(`/`, (req, res) => {

            let transaction = {
                id: uuid(),
                payload: 'some_payload'
            };

            this.log.initTransaction(transaction.id);

            this._disconnect_check()
                .then(() => this._prepare_mediators(transaction))
                .then(() => this.log.write(constants.COMMIT))
                .then(() => this._commit_mediators(transaction))
                .then(() => res.send(SUCCESS_MSG))
                .catch(DisconnectedError, () =>
                    this.log.write(constants.ABORT)
                        .then(res.send(FAIL_MSG))
                )
                .catch(PrepareNoVoteError, () =>
                    this.log.write(constants.ABORT)
                        .then(() => this._abort_mediators(transaction))
                        .then(() => res.send(FAIL_MSG))
                )
                .then(() => this.log.write(constants.END))
        });

        this._socket_server.on('connect', (subordinate_socket) => {
            subordinate_socket.once('handshake', (subordinate_id) => {
                console.log(`handshake from ${subordinate_id}`);

                if (this._subordinate_mediators_map[subordinate_id]) {
                    this._subordinate_mediators_map[subordinate_id].subordinate_socket = subordinate_socket;
                } else {
                    this._subordinate_mediators_map[subordinate_id] = new SubordinateMediator(subordinate_id, subordinate_socket);
                }

                this._disconnected.delete(subordinate_id);
                subordinate_socket.once('disconnect', () => console.error(`${subordinate_id} disconnected`) || this._disconnected.add(subordinate_id));
            });
        });

        this._server.listen(this._port, () => console.log(`listening on port ${this._port}`) || callback());
    }
}

module.exports = Coordinator;
