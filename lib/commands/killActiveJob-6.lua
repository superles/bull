--[[
  Attempts to reprocess a job

  Input:

   KEYS[1] jobId key
   KEYS[2] job lock key
   KEYS[3] active event,
   KEYS[4] killed event,
   KEYS[5] 'failed' key
   KEYS[6] 'active' key

    ARGV[1] job.id,
    ARGV[2] (job.opts.lifo ? 'R' : 'L') + 'PUSH'
    ARGV[3] local token
    ARGV[4] remote token
    ARGV[5] timestamp
    ARGV[6] data


  Output:
    1 means the operation was a success
    0 means the job does not exist
    -1 means the job is currently locked and can't be retried.
    -2 means the job was not found in the expected set.


]]

local rcall = redis.call
local jobKey = KEYS[1]
local jobId = ARGV[1]
local data = ARGV[6]
local killedEvent = KEYS[4]

redis.call("PUBLISH", killedEvent, data)

