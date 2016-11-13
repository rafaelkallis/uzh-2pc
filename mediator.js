/**
 * Created by rafaelkallis on 03.11.16.
 */
const Promise = require('bluebird');
const uuid = require('node-uuid').v4;
const PrepareNoError = require('./errors').PrepareNoVoteError;
const ACKError = require('./errors').ACKError;
const TimeoutError = require('./errors').TimeoutError;
const socket_client = require('socket.io-client');
const constants = require('./constants');
const PREPARE = constants.PREPARE;
const COMMIT = constants.COMMIT;
const ABORT = constants.ABORT;
const YES = constants.YES;
const ACK = constants.ACK;

const DELAY = require('./package.json').delay;

/**
 * Used by Subordinate for handling requests from Coordinator
 * @param id: a unique identifier for the Subordinate
 * @param coordinator_host: a URI in the "address:port" format
 * @param message_handler: a promise returning the subordinates response when fulfilled
 */
class CoordinatorMediator {
    constructor(id, coordinator_host, message_handler) {
        this._id = id;
        this._coordinator_host = coordinator_host;
        this._message_handler = message_handler;
    }

    _handshake(id) {
        console.log(`${this._id} send handshake to coordinator`);
        this._coordinator_socket.emit('handshake', id);
    }

    start() {
        this._coordinator_socket = socket_client(this._coordinator_host);
        this._coordinator_socket.on('connect', () => console.log(`${this._id} connected with coordinator`) || this._handshake(this._id));
        this._coordinator_socket.on('disconnect', () => console.log(`${this._id} has disconnected from coordinator`));
        this._coordinator_socket.on('message', (message) => {
            //console.log(`${this._id} has received ${JSON.stringify(message)}`);
            setTimeout(() => this._message_handler(message.type, message.payload, (result =>
                console.log(`${this._id} send ${JSON.stringify({id: message.id, type: result})}`) || this._coordinator_socket.send({id: message.id, type: result})))
            , DELAY)
        });
    }

    stop() {
        this._coordinator_socket.close();
    }
}

/**
 * Used by Coordinator to make requests to Subordinate
 * @param socket_server: the subordinate's socket_server.
 */
class SubordinateMediator {
    constructor(subordinate_id, socket) {
        this.subordinate_id = subordinate_id;
        this.subordinate_socket = socket;
    }

    _request(type, payload, callback, timeout_interval = 1000) {
        let id = uuid();
        timeout_interval = (DELAY ? DELAY * 2 + 100 : timeout_interval)
        let listener = (message) => {
            if (message.id == id) {
                clearTimeout(timeout);
                //console.log(`Coordinator has received ${JSON.stringify(message)}`);
                this.subordinate_socket.removeListener(`message`, listener);
                callback(null, message.type);
            }
        };

        let timeout = setTimeout(() => {
            this.subordinate_socket.removeListener(`message`, listener);
            callback(new TimeoutError());
        }, timeout_interval);

        this.subordinate_socket.on('message', listener);
        let message = {id: id, type: type, payload: payload};
        this.subordinate_socket.send(message);
        
        console.log(`Coordinator send ${JSON.stringify(message)}`);
    }

    _send_request(msg, payload, expected, error) {
        return new Promise((resolve, reject) => {
            this._request(msg, payload, (err, type) => {
                if(err || type != expected)
                    reject(new PrepareNoError(this.subordinate_id))
                else
                    resolve()
            });
        });
    }

    prepare(payload) {
        return this._send_request(PREPARE, payload, YES, PrepareNoError);
    }

    commit(payload) {
        return this._send_request(COMMIT, payload, ACK, ACKError);
    }

    abort(payload) {
        return this._send_request(ABORT, payload, ACK, ACKError);
    }
}

module.exports = {CoordinatorMediator, SubordinateMediator};
