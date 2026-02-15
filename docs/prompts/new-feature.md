Let's start a new feature. The feature id and description will be sent in this prompt, in the form ${feature-id}: ${feature-description} ask for them if not found or sure.
Then:
* Check if the feature id is unique, by checking if there is a branch with matching name
* If there is already a branch, switch to that branch and exit, informing the user
* If there is not a branch:
** create a new ticket with the feature id as title and description.
** create a new branch with the feature id
** switch to that branch
