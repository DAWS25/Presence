# Presence

An app to identify and control who's who inside a private space.
For example, control the presence of students in a classroom, club members, party guests, and so on.

It uses real-time face detection ([face-api.js](https://github.com/vladmandic/face-api)) via the browser camera, backed by a [FastAPI](https://fastapi.tiangolo.com/) API running on AWS Lambda (via [SAM](https://aws.amazon.com/serverless/sam/)), and PostgreSQL for most backend features.

Try it live at <a href="https://presence.daws25.com" target="_blank">https://presence.daws25.com</a>

# DISCLAIMER

Most privacy regulations and laws require consent for face recognition. 
Please make sure you have consent and comply with the applicable laws in your location.

# How to...

## Build and run this project

To make the developer experience as nice as possible, we use <a href="https://www.jetify.com/devbox" target="_blank">DevBox</a> and <a href="https://devcontainers.github.io" target="_blank">DevContainers</a>.
It should be as simple as this:
1. Start a new <a href="https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=1115772808&skip_quickstart=true&machine=standardLinux32gb&devcontainer_path=.devcontainer%2Fdevc[...]" target="_blank">GitHub Codespace</a>
1. Start a terminal and run your `devbox shell`. It will run automatically on codespaces.
1. Run `devbox services up` to start all application services (database, web server, proxy, ...).
1. Access the application:
   * Using HTTPS on https://local.env.daws25.com:10443/ to test locally with the same browser policies regarding HTTPS and CORS.
   * Using HTTP(S) over your codespaces forwarded port

Please open a discussion if you have any issues running this project.

# Project Layout

| Folder | Description |
|--------|-------------|
| `presence_web/` | Frontend web application (face-api.js, Bootstrap, QR codes) |
| `presence_lib/` | Shared JavaScript library — face detection, events, notifications, i18n |
| `presence_sam/` | Serverless backend — FastAPI on AWS Lambda via SAM, API Gateway, routes |
| `presence_auth/` | Authentication service package |
| `presence_edge_auth/` | Lambda@Edge function for Google OAuth callback and auth routing |
| `presence_edge_cors/` | Lambda@Edge function for CORS and FedCM headers |
| `presence_edge_hc/` | Lambda@Edge function for CloudFront health checks |
| `presence_edge_root/` | Lambda@Edge function for root path redirects |
| `presence_proxy/` | Nginx reverse proxy config and custom error pages for local development |
| `presence_cform/` | AWS CloudFormation templates (VPC, RDS, CloudFront, Route53, certificates) |
| `presence_config/` | CloudFormation and scripts for AWS SSM parameters (OIDC config) |
| `presence_cert/` | Local SSL certificates for HTTPS development |
| `scripts/` | Shell scripts for dev workflows (build, deploy, service startup) |
| `docs/` | Documentation, prompts, and feature tickets |

# Guias em Video (BR)

01 - [Como executar o projeto usando GitHub Codespaces e DevBox](https://youtu.be/st0muy6H4zs?si=mCcbemqCIvbVT6Fu)



# Join us!

This project is open to your contribution, be most welcome!

Built with ❤️ at <a href="https://linuxtips.io/descomplicando-aws/" target="_blank">LinuxTips.io</a>
