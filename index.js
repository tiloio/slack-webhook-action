const core = require('@actions/core');
const https = require('https');
const fs = require('fs');

const inputSlackJson = core.getInput('slack_json');
const webHookUrl = core.getInput('slack_web_hook_url');
const slackMentionMappingFilePath = core.getInput('slack_mention_mapping_file');
const commitSHA = process.env.GITHUB_SHA;
const repositoryName = process.env.GITHUB_REPOSITORY;
const authorName = process.env.GITHUB_ACTOR;
const eventPath = process.env.GITHUB_EVENT_PATH;
const runId = process.env.GITHUB_RUN_ID;

let slackMentionMappingData = null;

const hasSlackMentionMapping = () => slackMentionMappingFilePath != null
const slackMentionMapping = () => {
    if (hasSlackMentionMapping()) return null;

    if (slackMentionMappingData == null) {
        this.slackMentionMapping = JSON.parse(fs.readFileSync(slackMentionMappingFilePath, 'utf8'));
    }

    return this.slackMentionMapping;
}
const slackMention = (slackUserId) => `<@${slackUserId}>`;
const gitHubNameToSlackMention = (gitHubName) => {
    if (!hasSlackMentionMapping()) return gitHubName;

    const slackMappingObject = slackMentionMapping()[gitHubName];

    if (!slackMappingObject) return gitHubName;

    return slackMention(slackMappingObject.slackId);
}

const readEventFile = () => fs.readFileSync(eventPath, 'utf8');
const escapeUnicode = (str) => str.replace(/[^\0-~]/g, (ch) =>
    "\\u" + ("000" + ch.charCodeAt().toString(16)).slice(-4)
);
const commitMessage = () => JSON.parse(readEventFile()).commits[0].message;

const commonRegex = (name) => new RegExp(`{{\\s*${name}\\s*}}`, 'gi');
const envVariable = (name) => ({
    regex: commonRegex(name),
    data: () => process.env[name]
});
const customVariable = (name, data) => ({
    regex: commonRegex(name),
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
    customVariable('CUSTOM_ACTION_LINK', () => `https://github.com/${repositoryName}/actions/runs/${runId}`),
    customVariable('CUSTOM_GITHUB_ACTOR_AS_SLACK', () => gitHubNameToSlackMention(authorName)),
];

const replacer = (json) => {
    let replacedText = json;
    listOfVariables.forEach(variable => {
        replacedText = replacedText.replace(variable.regex, variable.data())
    });
    return replacedText;
};

function sendMessage(data) {
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
        }
    };

    return new Promise((resolve, reject) => {
        const post_req = https.request(webHookUrl, options, (res) => {
            res.on('data', chunk => resolve(chunk.toString()));
            res.on("error", err => reject(err));
        });

        post_req.write(data);
        post_req.end();
    });
}

(async () => {
    try {
        const data = escapeUnicode(replacer(inputSlackJson));
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
