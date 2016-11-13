/**
 * Created by rafaelkallis on 07.11.16.
 */

const http = require('http');
const Coordinator = require('./coordinator');
const Subordinate = require('./subordinate');

const endpoint = 'http://localhost:8080';

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
let sub1 = new Subordinate('subordinate1', endpoint);
let sub2 = new Subordinate('subordinate2', endpoint);
let sub3 = new Subordinate('subordinate3', endpoint);
let sub4 = new Subordinate('subordinate4', endpoint);

sub1.start();
sub2.start();
sub3.start();
sub4.start();

http.get({ host: 'localhost', port: 8080 }, (data) => {
    console.log(`Client receives: ${data}.`);
});