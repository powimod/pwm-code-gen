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
	if (project.objects.length === undefined)
		throw new Error(`Project object list is not a list`);
	if (project.objects.length === 0)
		throw new Error(`Project object list is empty`);
	if (verbose)
		console.log(`Object list :`);
	let i = 0;
	for (let projectObject of project.objects){
		i++;
		if (projectObject.name === undefined)
			throw new Error(`Name is not defined in object n°${i}`);
		if (projectObject.type === undefined)
			projectObject.type = 'string';
		if (verbose)
			console.log(`- Object ${projectObject.name} (type:${projectObject.type})`);

		if (projectObject.properties === undefined)
			throw new Error(`Property list is not defined in object <${projectObject.name}>`);
		if (projectObject.properties.length === undefined)
			throw new Error(`Property list is not a list in object <${projectObject.name}>`);
		if (projectObject.properties.length === 0)
			throw new Error(`Property list is empty in object <${projectObject.name}>`);
		if (verbose)
			console.log(`  Property list :`);
		let j = 0;
		for (let objectProperty of projectObject.properties){
			j++;
			if (objectProperty.name === undefined)
				throw new Error(`Name of property n°${j} of object <${projectObject.name}> is not defined`);
			if (objectProperty.type === undefined)
				objectProperty.type = 'string';
			if (verbose)
				console.log(`    - Property ${objectProperty.name} (type:${objectProperty.type})`);
		}
	}

	if (project.files === undefined)
		throw new Error(`Project file list is not defined`);
	if (project.files.length === undefined)
		throw new Error(`Project file list is not a list`);
	if (project.files.length === 0)
		throw new Error(`Project file list is empty`);
	if (verbose)
		console.log(`File list :`);
	i = 0;
	for (let projectFile of project.files){
		i++;
		if (projectFile.scope === undefined)
			throw new Error(`Scope is not defined in file n°${i}`);
		if (projectFile.input === undefined)
			throw new Error(`Input is not defined in file n°${i}`);
		if (projectFile.output === undefined)
			throw new Error(`Output is not defined in file n°${i}`);
		if (verbose)
			console.log(`- File n°${i} (scope:${projectFile.scope})`);
			console.log(`    -> input:${projectFile.input})`);
			console.log(`    -> ouptut:${projectFile.output})`);
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

	// control project validity
	try {
		controlProject(project, verbose);
	}
	catch (error) {
		console.error(`Error : ${error.message} in project file <${projectFile}> !`);
		process.exit(1);
	}

}

main();
