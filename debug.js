/**
 * Created by rafaelkallis on 07.11.16.
 */

const Coordinator = require('./coordinator');
const Subordinate = require('./subordinate');

/**
 * Listening for PUT on port 8080
 * @type {Coordinator}
 */
let coordinator = new Coordinator(8080);
coordinator.start(() => console.log('coordinator started'));

/**
 * Connecting to socket_server server (coordinator)
 * @type {Subordinate}
 */
let sub1 = new Subordinate('subordinate1', 'http://localhost:8080');
let sub2 = new Subordinate('subordinate2', 'http://localhost:8080');
let sub3 = new Subordinate('subordinate3', 'http://localhost:8080');
let sub4 = new Subordinate('subordinate4', 'http://localhost:8080');

sub1.start();
sub2.start();
sub3.start();
sub4.start();
