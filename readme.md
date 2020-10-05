# Slack webhook action

A GitHub Action which uses [Incoming WebHooks](https://api.slack.com/messaging/webhooks) to send messages to slack channels.

## Inputs

### `slack_web_hook_url`

**Required** The URL from Slack for the [Incoming WebHook](https://api.slack.com/messaging/webhooks).

### `slack_json`

**Required** You can use the [Slack Block Kit Builder](https://app.slack.com/block-kit-builder) to build your own message.
Just put this JSON into this input. You can use `{{placeholders}}` for more information.

#### `{{placeholders}}`

For example use `{{GITHUB_ACTOR}}` inside your`slack_json` input to show the username of the person who started the action.

You can use all this `{{placeholders}}`:

| Placeholder        | Renders to           | 
| ------------- |-------------| 
| CUSTOM_COMMIT_URL | https://github.com/${repositoryName}/commit/${commitSHA} |
| CUSTOM_AUTHOR_LINK | http://github.com/${authorName} |
| CUSTOM_AUTHOR_PICTURE | http://github.com/${authorName}.png?size=32 |
| CUSTOM_SHORT_GITHUB_SHA | process.env.GITHUB_SHA.substring(0, 7) |
| CUSTOM_COMMIT_MSG | commitMessage |
| CUSTOM_ACTION_LINK | https://github.com/${repositoryName}/actions/runs/${runId} |
| CUSTOM_GITHUB_ACTOR_AS_SLACK | creates an `@UserName` in the Slack message. Needs the `slack_mention_mapping_file` input, otherwise it will return the GitHub username. |
| GITHUB_WORKFLOW | The name of the workflow. |
| GITHUB_RUN_ID | 	A unique number for each run within a repository. This number does not change if you re-run the workflow run. |
| GITHUB_RUN_NUMBER | A unique number for each run of a particular workflow in a repository. This number begins at 1 for the workflow's first run, and increments with each new run. This number does not change if you re-run the workflow run. |
| GITHUB_ACTION | The unique identifier (id) of the action. |
| GITHUB_ACTIONS | Always set to true when GitHub Actions is running the workflow. You can use this variable to differentiate when tests are being run locally or by GitHub Actions. |
| GITHUB_ACTOR | The name of the person or app that initiated the workflow. For example, octocat. |
| GITHUB_REPOSITORY | The owner and repository name. For example, octocat/Hello-World. |
| GITHUB_EVENT_NAME | The name of the webhook event that triggered the workflow. |
| GITHUB_WORKSPACE | The GitHub workspace directory path. The workspace directory contains a subdirectory with a copy of your repository if your workflow uses the actions/checkout action. If you don't use the actions/checkout action, the directory will be empty. For example, /home/runner/work/my-repo-name/my-repo-name. |
| GITHUB_SHA | The commit SHA that triggered the workflow. For example, ffac537e6cbbf934b08745a378932722df287a53. |
| GITHUB_REF | The branch or tag ref that triggered the workflow. For example, refs/heads/feature-branch-1. If neither a branch or tag is available for the event type, the variable will not exist. |
| GITHUB_HEAD_REF | Only set for forked repositories. The branch of the head repository.  |
| GITHUB_BASE_REF | Only set for forked repositories. The branch of the base repository. |
| GITHUB_SERVER_URL | Returns the URL of the GitHub server. For example: https://github.com. |
| GITHUB_API_URL | Returns the API URL. For example: https://api.github.com. |
| GITHUB_GRAPHQL_URL | Returns the GraphQL API URL. For example: https://api.github.com/graphql. |

More information about the [GitHub placeholders (which are environment variables)](https://docs.github.com/en/free-pro-team@latest/actions/reference/environment-variables). 

### `slack_mention_mapping_file`

**Optional** Only needed when you want to map the GitHub usernames to Slack `@mentions`.

The file should look like: 
```json
{
    "john-smith": {
        "slackId": "1234465",
        "mentions": ["john" "johnSmith", "john-smith"]
    }
}
```

Where
 - **john-smith** is the GitHub Username,
 - **slackId** is the ID of the Slack-Account of this GitHub User (more here: https://api.slack.com/reference/surfaces/formatting#mentioning-users),
 - **mentions** an Array of Strings which are used to replace e.g. `@johnSmith` with a real Slack `@Mention`, it's case insensitive.

## Outputs

There are no outputs at the moment.

## Example usage

Example [.github/workflows/send-notification.yml](./.github/workflows/send-notification.yml) shows how to send custom messages in slack.

Do not forget to add your secret and your custom Slack Block Kit JSON:
```yml
[...]
      - name: Slack notification
        uses: tiloio/slack-webhook-action@v1.0.1
        with:
          slack_web_hook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
          slack_json: '{
                               "username": "{{GITHUB_ACTOR}}",
                               "text": "{{GITHUB_ACTOR}} made some notification",
                               "icon_url": "{{CUSTOM_AUTHOR_PICTURE}}",
                               "channel": "your_channel",
                               "blocks": [
                                   {
                                       "type": "section",
                                       "text": {
                                           "type": "mrkdwn",
                                           "text": "someone pushed something.\n_{{CUSTOM_COMMIT_MSG}}_"
                                       }
                                   },
                                   {
                                       "type": "context",
                                       "elements": [
                                           {
                                               "type": "mrkdwn",
                                               "text": ":speech_balloon: commit <{{CUSTOM_COMMIT_URL}}|{{CUSTOM_SHORT_GITHUB_SHA}}>"
                                           }
                                       ]
                                   }
                               ]
                           }'
[...]
```


# License

Licensed under [MIT](./LICENSE).
