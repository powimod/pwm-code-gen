/* pwm-code-generator - Powimod Code Generator
 * Copyright (C) 2023 Dominique Parisot
 *
 * main.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
'use strict';

function controlProject(project, verbose) {
	if (project.name === undefined) 
		throw new Error(`Project name is not defined`);
	if (verbose)
		console.log(`Project name : ${project.name}`);

	if (project.objects === undefined)
		throw new Error(`Project object list is not defined`);
	if (verbose)
		console.log(`Object list :`);
	for (let projectObject of project.objects){
		if (verbose)
			console.log(`- Object ${projectObject.name}`);
	}

}

async function main() {
	const { program } = require('commander');
	program
		.option('--verbose');
	program.parse();
	const options = program.opts();
	const verbose = options.verbose ? 1 : undefined;

	let projectFile = program.args[0];
	if (projectFile === undefined) {
		console.error(`Error : project file argument required!`);
		process.exit(1);
	}

	// read project file
	const yaml = require('js-yaml');
	const fs = require('fs');
	let project = null;
	try {
  		project = yaml.load(fs.readFileSync(projectFile, 'utf8'));
	}
	catch (error) {
		console.error(`Error : Can't read project file <${error}> !`);
		process.exit(1);
	}

	try {
		controlProject(project, verbose);
	}
	catch (error) {
		console.error(`Error : ${error.message} project file <${error}> !`);
		process.exit(1);
	}
}

main();
