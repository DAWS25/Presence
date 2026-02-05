from http.server import HTTPServer, BaseHTTPRequestHandler
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

class RequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        """Override to use logging instead of stderr"""
        logging.info(f"{self.address_string()} - {format % args}")
    
    def do_GET(self):
        self.handle_request()
    
    def do_POST(self):
        self.handle_request()
    
    def do_PUT(self):
        self.handle_request()
    
    def do_DELETE(self):
        self.handle_request()
    
    def do_PATCH(self):
        self.handle_request()
    
    def do_HEAD(self):
        self.handle_request()
    
    def do_OPTIONS(self):
        self.handle_request()
    
    def handle_request(self):
        """Handle all requests - return 401 for /user/ paths, 200 otherwise"""
        # Log request line
        logging.info(f"{self.command} {self.path} {self.request_version}")
        
        # Log headers
        for header, value in self.headers.items():
            logging.info(f"  {header}: {value}")
        
        # Determine response code
        if "/user/" in self.path:
            status_code = 401
        else:
            status_code = 200
        
        # Log response
        logging.info(f"-> {status_code}")
        
        # Send response
        self.send_response(status_code)
        self.end_headers()


def main():
    port = 12884
    server = HTTPServer(('0.0.0.0', port), RequestHandler)
    logging.info(f"Starting HTTP server on port {port}")
    logging.info(f"Protected paths containing '/user/' will return 401")
    logging.info(f"All other paths will return 200")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logging.info("\nShutting down server...")
        server.shutdown()


if __name__ == "__main__":
    main()
