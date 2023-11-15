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

const {Liquid} = require('liquidjs');
const yaml = require('js-yaml');
const fs = require('fs');

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

		if (projectObject.links !== undefined) {
			if (projectObject.links.length === undefined)
				throw new Error(`Link list is not a list in object <${projectObject.name}>`);
			if (projectObject.links.length === 0)
				throw new Error(`Link list is empty in object <${projectObject.name}>`);
			if (verbose)
				console.log(`  Link list :`);
			let j = 0;
			for (let objectLink of projectObject.links){
				j++;
				if (objectLink.link === undefined)
					throw new Error(`Target of link n°${j} of object <${projectObject.name}> is not defined`);
				if (objectLink.mandatory === undefined)
					objectLink.mandatory = false;
				if (objectLink.mandatory !== true && objectLink.mandatory !== false)
					throw new Error(`Mandatory attribut of link <${objectLink.link}> of object <${projectObject.name}> is is not a boolean`);
				if (verbose)
					console.log(`    - Link ${objectLink.link} (mandatory:${objectLink.mandatory})`);
				// check target source
				let sourceObject = null; 
				for (let obj of project.objects) {
					if (objectLink.link === obj.name) {
						sourceObject = obj;
						break;
					}
				}
				console.log(sourceObject.name);
				if (sourceObject === undefined) 
					throw new Error(`Unknown target link <${objectLink.link}> of object <${projectObject.name}>`);
				objectLink.sourceObject = sourceObject;
				if (sourceObject.linkedObjects === undefined)
					sourceObject.linkedObjects = [];
				sourceObject.linkedObjects.push(projectObject);
			}
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
		if (verbose) {
			console.log(`- File n°${i} (scope:${projectFile.scope})`);
			console.log(`    -> input:${projectFile.input})`);
			console.log(`    -> ouptut:${projectFile.output})`);
		}
	}

}

async function generateFiles(project, verbose) {
	const liquid = new Liquid();
	// generate files
	if (verbose)
		console.log("File generation:");
	let i = 0;
	for (let projectFile of project.files){
		i++;
		if (verbose) {
			console.log(`- File n°${i} (scope:${projectFile.scope})`);
			console.log(`    -> input:${projectFile.input})`);
			console.log(`    -> ouptut:${projectFile.output})`);
		}
		if (projectFile.scope === 'project') {
			let outputFile = await liquid.parseAndRender(projectFile.output, { project: project } );
			console.log(`* Generating project file ${outputFile}...`);
			let fileContent = await liquid.renderFile(projectFile.input, {project: project});
			fs.writeFileSync(outputFile, fileContent);
			continue;
		}
		for (let projectObject of project.objects){
			if (projectFile.scope === 'object') {
				let outputFile = await liquid.parseAndRender(projectFile.output, { object: projectObject, project: project } );
				console.log(`* Generating object file ${outputFile}...`);
				let fileContent = await liquid.renderFile(projectFile.input, {object: projectObject, project: project});
				fs.writeFileSync(outputFile, fileContent);
				continue;
			}
		}
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

	//try {
		await generateFiles(project, verbose)
	//}
	//catch (error) {
	//	console.error(`Error : ${error.message} in project file <${projectFile}> !`);
	//	process.exit(1);
	//}
}

main();
