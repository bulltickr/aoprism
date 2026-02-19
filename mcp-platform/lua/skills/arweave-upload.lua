-- Arweave Upload Skill (Simulated)
-- In a real scenario, this would interface with an Arweave gateway
-- For this demo, it simulates the upload and returns a mock TxId

Handlers.add(
  "Execute",
  Handlers.utils.hasMatchingTag("Action", "Execute"),
  function(msg)
    local args = {}
    
    -- Try to parse arguments
    if msg.Data and msg.Data ~= "" then
      local ok, decoded = pcall(json.decode, msg.Data)
      if ok then args = decoded end
    end

    local data = args.data or ""
    local tags = args.tags or {}

    if data == "" then
      ao.send({Target = msg.From, Action = "ExecuteResponse", Error = "No data provided for upload"})
      return
    end

    print("Arweave Upload Skill: processing simulated upload of " .. #data .. " bytes")

    -- Mock transaction ID
    local mockTxId = crypto.utils.sha256(data .. tostring(msg.Timestamp)):sub(1, 43)

    -- Send response
    ao.send({
      Target = msg.From,
      Action = "ExecuteResponse",
      Data = json.encode({
        status = "success",
        txId = mockTxId,
        url = "https://arweave.net/" .. mockTxId,
        size = #data,
        message = "Data simulated as uploaded to Arweave via decentralized skill."
      })
    })
  end
)
