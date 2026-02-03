import json

def lambda_handler(event, context):
    print(json.dumps(event))
    # fetch id from first path element on url
    path = event.get("rawPath") 
    # check if there is a path id element
    path_param = None
    if path and len(path) > 1:
        path_param = path.lstrip("/").split("/")[0]
    if path_param:
        msg = f"Hello, your presence id is {path_param}!"
        result = {
            "statusCode": 200,
            "body": json.dumps(msg),
        }
    else:
       # generate rand id and redirect
       rand_id =  "123456"  # placeholder for random id generation
       path_param = "/p/"+ rand_id
       body = "Redirecting to " + path_param
       result = {
            "statusCode": 302,
            "headers": {
                "Location": path_param
            },
            "body": json.dumps(body),
        }
    return result
