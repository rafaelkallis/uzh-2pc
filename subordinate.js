/**
 * Created by rafaelkallis on 03.11.16.
 */
const CoordinatorMediator = require('./mediator').CoordinatorMediator;
const constants = require('./constants');
const Log = require('./log');

const log = new Log("Subordinate");

const PREPARE = constants.PREPARE;
const COMMIT = constants.COMMIT;
const ABORT = constants.ABORT;
const YES = constants.YES;
const NO = constants.NO;
const ACK = constants.ACK;
const BUG_NO = constants.BUG_NO;
const BUG_TIMEOUT = constants.BUG_TIMEOUT;

class Subordinate {
    constructor(id, coordinator_host) {
        this.log = new Log(id);

        let message_handler = (type, payload, callback) => {
            this.log.initTransaction(payload.id);

            switch (type) {
                case PREPARE:
                    if(payload.payload == BUG_NO)
                        this.log.write(ABORT).then(() => callback(NO));
                    else
                        payload.payload != BUG_TIMEOUT && 
                            this.log.write(PREPARE)
                                .then(() => callback(YES))
                                .then(() => {
                                    // Inject bug
                                    if(this.should_die_after_prepare) {
                                        this.stop();
                                        setTimeout(() => this.start(), this.restoreTime);
                                        this.should_die_after_prepare = false;
                                    }
                                });
                    break;
                case COMMIT:
                    this.log.write(COMMIT);
                    payload.payload == BUG_TIMEOUT ? setTimeout(() => callback(ACK), 2000) : callback(ACK);
                    break;
                case ABORT:
                    this.log.write(ABORT);
                    payload.payload == BUG_TIMEOUT ? setTimeout(() => callback(ACK), 2000) : callback(ACK);
                    break;
            }
        };
        this._coordinator_med = new CoordinatorMediator(id, coordinator_host, message_handler);
    }

    die_after_next_prepare(restoreTime) {
        this.should_die_after_prepare = true;
        this.restoreTime = restoreTime; 
    }

    start() {
        this._coordinator_med.start();
    }

    stop() {
        this._coordinator_med.stop();
    }
}

module.exports = Subordinate;