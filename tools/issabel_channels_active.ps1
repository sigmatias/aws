$ip = "44.213.63.39"
$key = "aws\asterisk-ep1.pem"
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -i $key ubuntu@$ip "sudo docker exec issabel asterisk -rx 'core show channels verbose'"
