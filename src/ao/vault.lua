
-- AOPRISM Data Vault (v1.0)
-- Secure, Encrypted Blob Storage for Agents.
-- Implements "Owner-Only" Access Control.

local json = require("json")
local ao = require("ao")

-- State
Vault = Vault or {
  Owner = nil,
  Blobs = {} -- Key -> { CipherText, IV, Hash }
}

-- Handlers

-- 1. Initialize (Set Owner)
Handlers.add("Initialize",
  Handlers.utils.hasMatchingTag("Action", "Initialize"),
  function(msg)
    if Vault.Owner then
      ao.send({ Target = msg.From, Data = "Vault already initialized." })
      return
    end
    Vault.Owner = msg.From
    ao.send({ Target = msg.From, Data = "Vault Secured. Owner set to: " .. msg.From })
  end
)

-- 2. Store Blob (Owner Only)
Handlers.add("Store",
  Handlers.utils.hasMatchingTag("Action", "Store"),
  function(msg)
    if msg.From ~= Vault.Owner then
      ao.send({ Target = msg.From, Data = "Unauthorized Access." })
      return
    end

    local key = msg.Tags.Key
    local iv = msg.Tags.IV
    local data = msg.Data -- CipherText

    if not key or not iv then
      ao.send({ Target = msg.From, Data = "Missing Key or IV." })
      return
    end

    Vault.Blobs[key] = {
      Data = data,
      IV = iv,
      Timestamp = msg.Timestamp
    }

    ao.send({ Target = msg.From, Data = "Blob Stored: " .. key })
  end
)

-- 3. Retrieve Blob (Owner Only)
Handlers.add("Retrieve",
  Handlers.utils.hasMatchingTag("Action", "Retrieve"),
  function(msg)
    if msg.From ~= Vault.Owner then
      ao.send({ Target = msg.From, Data = "Unauthorized Access." })
      return
    end

    local key = msg.Tags.Key
    local blob = Vault.Blobs[key]

    if not blob then
      ao.send({ Target = msg.From, Data = "Blob Not Found." })
      return
    end

    ao.send({
      Target = msg.From,
      Tags = {
        Action = "Blob-Response",
        Key = key,
        IV = blob.IV
      },
      Data = blob.Data
    })
  end
)

-- 4. List Keys (Owner Only)
Handlers.add("List",
  Handlers.utils.hasMatchingTag("Action", "List"),
  function(msg)
    if msg.From ~= Vault.Owner then return end
    
    local keys = {}
    for k, v in pairs(Vault.Blobs) do
      table.insert(keys, k)
    end
    
    ao.send({ Target = msg.From, Data = json.encode(keys) })
  end
)
