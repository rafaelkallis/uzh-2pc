
const Promise = require('bluebird');

const fs = Promise.promisifyAll(require('fs'));

const COORDINATOR_LOG = "logs/coordinator.txt"
const SUBORDINATE_LOG = "logs/subordinate.txt"

function assertStringParam(str, paramname) {
    if(typeof str !== 'string')
        throw new TypeError(`The parameter ${paramname} has to be of type string!`)
    if(!str || str.trim() === "")
        throw new Error(`The parameter ${paramname} has to be given!`)
}

class Log {
    constructor(name) {
        assertStringParam(name, 'name');

        this.issuer = name;
        this.filename = `${name.toLowerCase()}.txt`;

        try { fs.accessSync('logs') }
        catch(err) { fs.mkdirSync('logs') };
    }

    initTransaction(transactionid) {
        this.transactionid = transactionid;
    }

    readLog() {
        let location = `logs/${this.filename}`;

        return fs.accessAsync(location, fs.constants.F_OK | fs.constants.R_OK)
            .then(() => fs.readFileAsync(location, 'utf8'))
            .then(file => {
                let lines = file
                    .replace('\r', '')
                    .split('\n');
                
                return lines.map(l => {
                    let line = l.split('#');
                    return {
                        issuer: this.issuer,
                        transaction: line[2],
                        type: line[1]
                    };
                });
            })
    }

    write(msg, identifier) {
        if(!this.transactionid)
            throw new Error("No transaction initialized on logger!");

        identifier = identifier ? `#${identifier}` : '';
        
        let location = `logs/${this.filename}`;
        let message = `${this.issuer}${identifier}#${msg}#${this.transactionid}\n`;

        console.log(`Writing log: ${message.substr(0, message.length-1)}`);

        return fs.appendFileAsync(location, message);
    }
}

module.exports = Log;