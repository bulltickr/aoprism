--[[
  PRISM KERNEL API
  Use these global objects and methods when writing Skills.
]]

-- 1. THE MESSAGE OBJECT
-- Every Execute function receives `msg`.
-- msg.From (string): Sender ID
-- msg.Data (string): The payload
-- msg.Tags (table): Key-Value tags
-- msg.Timestamp (number): Time of message matching

-- 2. THE KERNEL OBJECT
-- Passed to Execute(msg, kernel)

-- kernel.Skills (table)
-- List of loaded skills.

-- 3. SENDING MESSAGES (Standard AO)
ao.send({
  Target = msg.From,
  Action = "ResponseAction",
  Data = "Your Payload Here"
})

-- 4. STATE MANAGEMENT
-- Do NOT use global variables for state.
-- Use the specific `state` table passed to your execute function if stateful.
-- (Note: v1.0 Kernel currently relies on global state in modules, but standardizing is recommended)
