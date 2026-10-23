const EventEmitter = require('events');

class SplitBroEventEmitter extends EventEmitter {
    constructor() {
        super();
        this.on('error', (err) => {
            console.error('[SplitBro Event Error Handler]', err);
        });
    }

    emitNonBlocking(eventName, payload, callback) {
        process.nextTick(() => {
            this.emit(eventName, payload);
            if (typeof callback === 'function') {
                setImmediate(() => callback(null, payload));
            }
        });
    }
}

const appEvents = new SplitBroEventEmitter();

appEvents.on('expense:created', (data) => {
    console.log(`[EVENT: expense:created] Group ${data.groupId}: "${data.title}" (₹${data.amount}) by ${data.payerId}`);
});

appEvents.on('settlement:recorded', (data) => {
    console.log(`[EVENT: settlement:recorded] Group ${data.groupId}: ₹${data.amount} from ${data.from} to ${data.to}`);
});

appEvents.on('group:created', (data) => {
    console.log(`[EVENT: group:created] Group "${data.groupName}" (ID: ${data.groupId}) created by ${data.createdBy}`);
});

module.exports = appEvents;
