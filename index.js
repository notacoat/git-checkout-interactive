#!/usr/bin/env node

const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const prompts = require('prompts');
const matchSorter = require("match-sorter").default;

const IGNORED_BRANCHES = [
  "HEAD",
  "dependabot",
];

async function run() {
  const args = process.argv;
  let remote = '';
  if (args[2] === '--remote' || args[2] === '-r') {
    remote = '-r';
  }
  const { stdout: branches } = await exec(`git branch -v ${remote} --sort=-committerdate`);
  const choices = branches
    .split(/\n/)
    .filter((branch) => {
      if (IGNORED_BRANCHES.filter(ignored => branch.includes(ignored)).length) {
        return false;
      }
      return true;
    })
    .filter(branch => !!branch.trim())
    .map((branch) => {
      const [, flag, value] = branch.match(/([* ]) +([^ ]+) +(.+)/);
      return { value, disabled: flag === "*" };
    });

  const autoCompleteSuggest = (input, choices) =>
    Promise.resolve(
      choices.filter((i) => {
        return matchSorter([{ ...i }], input, { keys: ["value"] }).length > 0;
      })
    );

  let { branch } = await prompts({
    type: "autocomplete",
    name: "branch",
    suggest: autoCompleteSuggest,
    message: "Switch branch",
    fallback: "Branch not found",
    choices,
    warn: 'current branch'
  });
  if (branch) {
    await checkout(branch.replace(/^origin\//g, ''));
  };
}

async function checkout(branch) {
  if (!branch) return;
  const { stdout, stderr } = await exec(`git checkout ${branch}`);
  process.stdout.write(stdout);
  process.stderr.write(stderr);
}

function onError(e) {
  if (e.stderr) {
    process.stderr.write(e.stderr);
  } else {
    console.error(e);
  }
}

run().catch(onError);
