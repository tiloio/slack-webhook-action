# Slack webhook action

A GitHub Action which uses [Incoming WebHooks](https://api.slack.com/messaging/webhooks) to send messages to slack channels.

## How to use it

Example `.github/workflows/deployment.yml` show how to send custom messages in slack.
You can use parameters for all [environment variables](https://docs.github.com/en/free-pro-team@latest/actions/reference/environment-variables) for example `{{GITHUB_ACTOR}}` which renders to the name of the person who started the action.

Do not forget to add your secrets and modify the inputs:
```yml
[...]
      - name: Slack notification
        uses: ./actions/slack
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

### Build your own message

You can use the [Slack Block Kit Builder](https://app.slack.com/block-kit-builder) to build your own message.
Just put this JSON into the `slack_json` input parameter.

### Custom parameters

We also added some custom parameters which have more information.

| Placeholder        | Renders to           | 
| ------------- |-------------| 
| CUSTOM_COMMIT_URL | https://github.com/${repositoryName}/commit/${commitSHA} |
| CUSTOM_AUTHOR_LINK | http://github.com/${authorName} |
| CUSTOM_AUTHOR_PICTURE | http://github.com/${authorName}.png?size=32 |
| CUSTOM_SHORT_GITHUB_SHA | process.env.GITHUB_SHA.substring(0, 7) |
| CUSTOM_COMMIT_MSG | commitMessage |
| CUSTOM_ACTION_LINK | https://github.com/${repositoryName}/actions/runs/${runId} |

And you can use all here listed [environment variables](https://docs.github.com/en/free-pro-team@latest/actions/reference/environment-variables). 

