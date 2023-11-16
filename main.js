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
const assert = require('node:assert/strict');


function loadPropertyName(property, name) {
	if (property.name !== null) // FIXME add property number in error message
		throw new Error(`Name of property of object <${property.object.name}> already defined`);
	name = name.trim();
	if (name.length === 0) // FIXME add property number in error message
		throw new Error(`Property name of object <${property.object.name}> is empty`);
	property.name = name;
}

function loadPropertyType(object, property, propType) {
	// FIXME in exception message, object.name can be null
	// if <type> is defined before <name> in YAML
	if (property.type !== null) // FIXME add property number in error message
		throw new Error(`Type of property <${property.name}> of object <${object.name}> already defined`);
	propType = propType.trim();
	if (propType.length === 0) // FIXME add property number in error message
		throw new Error(`Property name of object <${object.name} is empty`);
	property.type = propType;
}

function loadPropertyMandatory(object, property, propMandatory) {
	if (property.mandatory !== null) // FIXME add property number in error message
		throw new Error(`Attribute <mandatory> of property <${object.name}.${property.name}> is already defined`);
	if (propMandatory !== true && propMandatory !== false) // FIXME add property number in error message
		throw new Error(`Property <mandatory> of object <${object.name} is not a boolean`);
	property.mandatory = propMandatory;
}


function loadObjectPropertyList(object, propertiesDefinition) {
	if (propertiesDefinition.length === undefined)
		throw new Error(`Property list of object <${object.name}> is not an array`);

	let iProperty = 0;
	for (let propertyDefinition of propertiesDefinition) {
		iProperty++;
		let property = {
			name : null,
			type: null,
			mandatory: null,
			object: object
		};

		for (let attrName in propertyDefinition) {
			let attrValue = propertyDefinition[attrName];
			switch (attrName) {
				case 'name':
					loadPropertyName(property, attrValue);
					break;
				case 'type':
					loadPropertyType(object, property, attrValue);
					break;
				case 'mandatory':
					loadPropertyMandatory(object, property, attrValue);
					break;
				default:
					throw new Error(`Unknown attribut <${attrName}> in object ${object.name}`);
					break;
			}
		}
		if (property.name === null)
			throw new Error(`Name of property n°${iProperty} of object ${object.name} is not defined`);
		if (property.type === null)
			throw new Error(`Type of property n°${iProperty} of object ${object.name} is not defined`);
		if (property.mandatory === null)
			property.mandatory = true;
		object.properties.push(property);
	}
}


function loadObjectName(object, name) {
	if (object.name !== null)
		throw new Error(`Object name already defined`);
	name = name.trim();
	if (name.length === 0)
		throw new Error(`Object name is empty`);
	object.name = name;
}

function loadProjectObjectList(project, objectsDefinition) {
	if (objectsDefinition.length === undefined)
		throw new Error(`Object list is not an array`);
	if (project.objects.length > 0)
		throw new Error(`Objects list already loaded`);

	let iObject = 0;
	for (let objectDefinition of objectsDefinition) {
		iObject++;
		let object = {
			name: null,
			properties: [],
			links : [],
			project: project
		};

		for (let attrName in objectDefinition) {
			let attrValue = objectDefinition[attrName];
			switch (attrName) {
				case 'name':
					loadObjectName(object, attrValue);
					break;
				case 'properties':
					loadObjectPropertyList(object, attrValue);
					break;
				case 'links':
					// links loading is done in second step
					break;
				default:
					throw new Error(`Unknown attribut <${attrName}>`);
					break;
			}
		}
		if (object.name === null)
			throw new Error(`Name of object n°${iObject} is not defined`);
		if (object.properties.length === 0)
			throw new Error(`Property list of object <${object.name}> is empty`);
		project.objects.push(object);
	}
}

function loadProjectName(project, name) {
	if (project.name !== null)
		throw new Error(`Project name already defined`);
	name = name.trim();
	if (name.length === 0)
		throw new Error(`Project name is empty`);
	project.name = name;
}

function loadProjectStep1(project, projectDefinition, verbose)
{
	for (let attrName in projectDefinition) {
		let attrValue = projectDefinition[attrName];
		switch (attrName) {
			case 'name':
				loadProjectName(project, attrValue);
				break;
			case 'objects':
				loadProjectObjectList(project, attrValue);
				break;
			case 'files':
				// TODO implementation
				break;
			default:
				throw new Error(`Unknown attribut <${attrName}>`);
				break;
		}
	}
	if (project.name === null)
		throw new Error(`Project name is not defined`);
	if (project.objects.length === 0)
		throw new Error(`Project object list is empty`);

}

function loadLinkName(objectLink, name) {
	if (objectLink.name !== null)
		throw new Error(`Object link name already defined`);
	name = name.trim();
	if (name.length === 0)
		throw new Error(`Object link name is empty`);
	objectLink.name = name;
}

function loadLinkMandatory(objectLink, value) {
	if (objectLink.mandatory !== null)
		throw new Error(`Object link mandatory property already defined`);
	if (value !== true && value !== false)
		throw new Error(`Property <mandatory> of link <${link.name} is not a boolean`);
	objectLink.mandatory = value;
}

function loadLinkTarget(objectLink, targetObjectName) {
	if (objectLink.target !== null)
		throw new Error(`Object link target already defined`);
	if (targetObjectName.trim === undefined)
		throw new Error('Link target is not a string');
	targetObjectName = targetObjectName.trim();


	assert.ok(objectLink.object !== undefined);
	assert.ok(objectLink.object.project !== undefined);
	let project = objectLink.object.project;
	
	let targetObject = project.objects.find( obj => obj.name === targetObjectName );
	if (targetObject === undefined)
		throw new Error(`Object link target <${targetObjectName}> does not exist`);

	objectLink.target = targetObject;
}



function loadLink(projectObject, linkDef, verbose) {
	let objectLink = {
		name: null,
		target: null,
		mandatory: null,
		object: projectObject
	}
	for (let attrName in linkDef) {
		let attrValue = linkDef[attrName];
		switch (attrName) {
			case 'name':
				loadLinkName(objectLink, attrValue);
				break;
			case 'target':
				loadLinkTarget(objectLink, attrValue);
				break;
			case 'mandatory':
				loadLinkMandatory(objectLink, attrValue);
				break;
			default:
				throw new Error(`Unknown attribut <${attrName} in link definition>`);
				break;
		}
	}
	if (objectLink.name === null)
		throw new Error(`Link target is not defined`);
	if (objectLink.target=== null)
		throw new Error(`Target of link <${objectLink.name}> is not defined`);
	if (objectLink.mandatory === null)
		objectLink.mandatory = true;
	projectObject.links.push(objectLink);
}

function loadProjectStep2(project, projectDefinition, verbose)
{
	for (let objectDef of projectDefinition.objects) {
		let projectObject = project.objects.find( (obj) => obj.name === objectDef.name );
		assert.ok(projectObject !== undefined);

		let linkListDef = objectDef.links;
		if (linkListDef === undefined)
			continue;
		if (linkListDef.length === undefined)
			throw new Error(`Link list of object ${object.name} is not an array`);

		for (let linkDef of linkListDef)
			loadLink(projectObject, linkDef, verbose);
	}
}


function dumpProject(project)
{
	function tab(n) {
		return ' '.repeat(n);
	}
	console.log(`\nProject <${project.name}> :`);
	for (let projectObject of project.objects) {
		console.log(`${tab(2)}- Object <${projectObject.name}> :`);
		console.log(`${tab(2)}  Properties : x${projectObject.properties.length}`);
		for (let property of projectObject.properties) {
			console.log(`${tab(6)}- Property <${property.name}> (type:${property.type}, mandatory:${property.mandatory})`);
		}
		console.log(`${tab(2)}  Links : x${projectObject.links.length}`);
		for (let objectLink of projectObject.links ) {
			console.log(`${tab(6)}- Link <${objectLink.name}> (target:${objectLink.target.name}, mandatory:${objectLink.mandatory})`);
		}
	}
	console.log('');
}


function loadProject(projectDefinition, verbose)
{
	let project = {
		name : null,
		objects : [] 
	};
	loadProjectStep1(project, projectDefinition, verbose);
	loadProjectStep2(project, projectDefinition, verbose);
	if (verbose)
		dumpProject(project);
	return project;
}

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
	program.option('--verbose');
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
		//controlProject(project, verbose);
		loadProject(project, verbose);
	}
	catch (error) {
		console.error(`Error : ${error.message} in project file <${projectFile}> !`);
		process.exit(1);
	}

	//try {
		//await generateFiles(project, verbose)
	//}
	//catch (error) {
	//	console.error(`Error : ${error.message} in project file <${projectFile}> !`);
	//	process.exit(1);
	//}

	console.log('End.');
}

main();
