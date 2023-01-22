const core = require('@actions/core');
const https = require('https');
const fs = require('fs');
const path = require('path');

const inputSlackJson = core.getInput('slack_json');
const webHookUrl = core.getInput('slack_web_hook_url');
const slackMentionMappingFilePath = core.getInput('slack_mention_mapping_file');
const commitSHA = process.env.GITHUB_SHA;
const repositoryName = process.env.GITHUB_REPOSITORY;
const authorName = process.env.GITHUB_ACTOR;
const eventPath = process.env.GITHUB_EVENT_PATH;
const runId = process.env.GITHUB_RUN_ID;


const escapeRegex = (string) => string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

let slackMentionMappingData = null;

const slackMentionMapping = () => {
    if (!slackMentionMappingFilePath) return null;

    if (slackMentionMappingData == null) {
        try {
            this.slackMentionMapping = JSON.parse(fs.readFileSync(slackMentionMappingFilePath, 'utf8'));
        } catch (error) {
            core.warning('Could not get slack mention mapping! Looking for file at "' + path.resolve(slackMentionMappingFilePath) + '".\n' + error)
            return null;
        }
    }

    return this.slackMentionMapping;
}
const slackMention = (slackUserId) => `<@${slackUserId}>`;
const mentionRegex = (mention) => new RegExp(`@${escapeRegex(mention)}`, 'gi');
const gitHubNameToSlackMention = (gitHubName) => {
    if (!slackMentionMapping()) return gitHubName;

    const slackMappingObject = slackMentionMapping()[gitHubName];
    if (!slackMappingObject) return gitHubName;

    return slackMention(slackMappingObject.slackId);
}
const replaceAllMentions = (json) => {
    if (!slackMentionMapping()) return json;

    let replacedText = json;
    Object.entries(slackMentionMapping()).forEach(([key, user]) => {
        if (user.mentions) {
            user.mentions.forEach(mention => {
                replacedText = replacedText.replace(mentionRegex(mention), slackMention(user.slackId));
            });
        }
    });
    return replacedText;
}

const gitHubEvents = () => JSON.parse(fs.readFileSync(eventPath, 'utf8'));
const commitMessage = () => {
    const event = gitHubEvents();
    if (!event || !event.commits || !event.commits.length > 0) {
        core.warning('No commit message found in Event!\n' + JSON.stringify(event));
        return '[[no-commit-message-found!]]';
    }
    return event.commits[event.commits.length - 1].message
}

const commitMessages = () => {
    const event = gitHubEvents();
    if (!event || !event.commits || !event.commits.length > 0) {
        core.warning('No commit message found in Event!\n' + JSON.stringify(event));
        return '[[no-commit-message-found!]]';
    }
    return `- ${event.commits.map(({ message }) => message).join('\n- ')}`;
}

const tagRegex = name => new RegExp(`{{\\s*${name}\\s*}}`, 'gi');
const envVariable = name => ({
    regex: tagRegex(name),
    data: () => process.env[name]
});
const customVariable = (name, data) => ({
    regex: tagRegex(name),
    data: data
});
const listOfVariables = [
    envVariable('GITHUB_WORKFLOW'),
    envVariable('GITHUB_RUN_ID'),
    envVariable('GITHUB_RUN_NUMBER'),
    envVariable('GITHUB_ACTION'),
    envVariable('GITHUB_ACTIONS'),
    envVariable('GITHUB_ACTOR'),
    envVariable('GITHUB_REPOSITORY'),
    envVariable('GITHUB_EVENT_NAME'),
    envVariable('GITHUB_WORKSPACE'),
    envVariable('GITHUB_SHA'),
    envVariable('GITHUB_REF'),
    envVariable('GITHUB_HEAD_REF'),
    envVariable('GITHUB_BASE_REF'),
    envVariable('GITHUB_SERVER_URL'),
    envVariable('GITHUB_API_URL'),
    envVariable('GITHUB_GRAPHQL_URL'),
    customVariable('CUSTOM_COMMIT_URL', () => `https://github.com/${repositoryName}/commit/${commitSHA}`),
    customVariable('CUSTOM_AUTHOR_LINK', () => `http://github.com/${authorName}`),
    customVariable('CUSTOM_AUTHOR_PICTURE', () => `http://github.com/${authorName}.png?size=32`),
    customVariable('CUSTOM_SHORT_GITHUB_SHA', () => process.env.GITHUB_SHA.substring(0, 7)),
    customVariable('CUSTOM_COMMIT_MSG', () => commitMessage()),
    customVariable('CUSTOM_COMMIT_MSGS', () => commitMessages()),
    customVariable('CUSTOM_ACTION_LINK', () => `https://github.com/${repositoryName}/actions/runs/${runId}`),
    customVariable('CUSTOM_GITHUB_ACTOR_AS_SLACK', () => gitHubNameToSlackMention(authorName)),
];

const escapeUnicode = str => str.replace(/[^\0-~]/g, ch =>
    "\\u" + ("000" + ch.charCodeAt().toString(16)).slice(-4)
);

const replacer = json => {
    let replacedText = json;
    listOfVariables.forEach(variable => {
        replacedText = replacedText.replace(variable.regex, variable.data())
    });
    return replacedText;
};

const sendMessage = data =>
    new Promise((resolve, reject) => {
        const request = https.request(
            webHookUrl,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length,
                }
            },
            response => {
                response.on('data', responseData => resolve(responseData.toString()));
                response.on("error", error => reject(error));
            }
        );

        request.on('error', error => reject(error));
        request.write(data);
        request.end();
    });

(async () => {
    try {
        const data = escapeUnicode(replaceAllMentions(replacer(inputSlackJson)));
        if (!data) throw 'There is nothing to send! Please check your slack_json parameter!'
        const result = await sendMessage(data);

        if (result !== 'ok') {
            if (result === 'invalid_payload') {
                core.setFailed('Could not send notification with invalid payload: ' + data);
            } else {
                core.setFailed('Could not send notification: ' + result);
            }
        }
    } catch (error) {
        core.setFailed(error.message);
    }
})();
