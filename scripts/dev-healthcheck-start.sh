#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(dirname "$SCRIPT_DIR")"
pushd "$DIR"
# 

sleep 10
TIMEOUT=${1:-15}

while true; do
    ts=$(date +"%d/%b/%Y:%H:%M:%S %z")
    # https://local.env.daws25.com:10443/fn/__hc
    host="local.env.daws25.com"
    port="10443"
    path="/fn/__hc"
    url="https://${host}:${port}${path}"

    output=$(curl -sk --max-time "$TIMEOUT" -o /dev/null -w "%{http_code} %{size_download}" "$url")
    curl_exit=$?
    if [[ $curl_exit -ne 0 || -z "$output" ]]; then
        status="000"
        bytes="0"
    else
        status=${output%% *}
        bytes=${output##* }
    fi

    if [[ "$status" =~ ^[23] ]]; then
        emoji="✅"
    else
        emoji="❌"
    fi

    printf '%s %s - - [%s] "GET %s HTTP/1.1" %s %s\n' "$emoji" "$host" "$ts" "$path" "$status" "$bytes"
    sleep 30
done

#
popd