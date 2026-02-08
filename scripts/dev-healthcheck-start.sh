#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(dirname "$SCRIPT_DIR")"
pushd "$DIR"
# 

sleep 10
TIMEOUT=${1:-15}

host="local.env.daws25.com"
port="10443"
path="/fn/__hc"
url="https://${host}:${port}${path}"

echo "Checking health of $url"
while true; do
    ts=$(date +"%d/%b/%Y:%H:%M:%S %z")


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
        sleep_duration=30
    else
        emoji="❌"
        sleep_duration=10
    fi

    printf '%s %s - - [%s] "GET %s HTTP/1.1" %s %s\n' "$emoji" "$host" "$ts" "$path" "$status" "$bytes"
    sleep "$sleep_duration"
done

#
popd