export $(grep -v '^#' .env | xargs)
export $(grep -v '^#' .env | xargs)


it reloads the variable into terminal


source .env
printf "%s" "$PRIVATE_KEY" | wc -c

Contract Address: 0x851Dcb8f553112AC98C321838a181774Dac1021c

forge script script/Deploy.s.sol \
  --fork-url "$RPC_URL" \
  --broadcast \
  --private-key "$PRIVATE_KEY"




cast call \
  $CONTRACT_ADDRESS \
  "admins(address)(bool)" \
  0x0000000000000000000000000000000000000001 \
  --rpc-url $RPC_URL


