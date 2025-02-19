'use strict';

//TODO remove for node >= 10
require('promise.prototype.finally').shim();

module.exports = function(processFile, childPool) {
  return function process(job) {
    return childPool.retain(processFile).then(child => {
      let msgHandler;
      let exitHandler;

      child.jobId = job.id;

      job.update({...job.data, pid: child.pid, worker: {clientName: this.clientName(), token: this.token}})
          .catch(console.error);

      child.send({
        cmd: 'start',
        job: job
      });

      const done = new Promise((resolve, reject) => {
        msgHandler = function(msg) {
          switch (msg.cmd) {
            case 'completed':
              resolve(msg.value);
              break;
            case 'failed':
            case 'error': {
              const err = new Error();
              Object.assign(err, msg.value);
              reject(err);
              break;
            }
            case 'progress':
              job.progress(msg.value);
              break;
            case 'update':
              job.update(msg.value);
              break;
            case 'discard':
              job.discard();
              break;
            case 'log':
              job.log(msg.value);
              break;
          }
        };
        exitHandler = (exitCode, signal) => {
          if (exitCode === 200){
            return reject(
              new Error(
                'cleaned'
              )
            );
          }
          if (exitCode === 100 || signal === 'SIGKILL') {
            return reject(
                new Error(
                    'killed'
                )
            );
          }
          reject(
            new Error(
              'Unexpected exit code: ' + exitCode + ' signal: ' + signal
            )
          );
        };
        child.on('message', msgHandler);
        child.on('exit', exitHandler);
      });

      return done.finally(() => {
        child.jobId = null;
        child.removeListener('message', msgHandler);
        child.removeListener('exit', exitHandler);

        if (child.exitCode !== null || /SIG.*/.test(child.signalCode)) {
          childPool.remove(child);
        } else {
          childPool.release(child);
        }
      });
    });
  };
};
