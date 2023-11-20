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

const programName = 'pwm-code-generator';
const version = {
	major: 0,
	minor: 2,
	revision: 0
};

const {Liquid} = require('liquidjs');
const yaml = require('js-yaml');
const fs = require('fs');
const assert = require('node:assert/strict');

const internalDataTypes = [
	{ internal: true, name: 'string',  type: 'string'},
	{ internal: true, name: 'integer', type: 'integer'},
	{ internal: true, name: 'uuid',    type: 'string'},
	{ internal: true, name: 'id',      type: 'integer'},
	{ internal: true, name: 'boolean', type: 'boolean'},
	{ internal: true, name: 'date',    type: 'Date'},
];


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
	if (typeof(propType) !== 'string')
		throw new Error(`Type of property <${property.name}> of object <${object.name}> is not a string`);
	propType = propType.trim();
	if (propType.length === 0) // FIXME add property number in error message
		throw new Error(`Property name of object <${object.name} is empty`);
	const project = object.project;
	assert(project !== undefined);
	let dataType = project.dataTypes.find( dt => dt.name === propType);
	if (dataType === undefined)
		throw new Error(`Unknown data type <${propType}> for property <${property.name}> of object <${object.name}>`);
	property.type = dataType;
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
			_type: 'object-property',
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
					throw new Error(`Unknown attribut <${attrName}> in  property ${property.name} of object ${object.name}`);
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

function loadObjectAttributeName(attribute, name)
{
	if (attribute.name !== null) 
		throw new Error(`Name of attribute of object <${attribute.object.name}> already defined`);
	name = name.trim();
	if (name.length === 0)
		throw new Error(`Property name of object <${attribute.object.name}> is empty`);
	if (name.includes(' '))
		throw new Error(`Invalid attribute name <${name}> of object <${attribute.object.name}> is empty (spaces forbidden)`);
	attribute.name = name;
}

function loadObjectAttributeValue(attribute, value)
{
	if (attribute.value !== null) 
		throw new Error(`Value of attribute <${attribute.name}> of object <${attribute.object.name}> already defined`);
	value = value.trim();
	if (value.length === 0)
		throw new Error(`Value of attribute <${attribute.name}> of object <${attribute.object.name}> is empty`);
	attribute.value = value;
}


function loadObjectAttributeList(object, attributesDefinition) {
	if (attributesDefinition.length === undefined)
		throw new Error(`Attribute list of object <${object.name}> is not an array`);

	let iAttribute = 0;
	for (let attributeDefinition of attributesDefinition) {
		iAttribute++;
		let attribute = {
			_type: 'object-attribute',
			name : null,
			value: null,
			object: object
		};

		for (let attrName in attributeDefinition) {
			let attrValue = attributeDefinition[attrName];
			switch (attrName) {
				case 'name':
					loadObjectAttributeName(attribute, attrValue);
					break;
				case 'value':
					loadObjectAttributeValue(attribute, attrValue);
					break;
				default:
					// FIXME double use of attribute in the same error message
					throw new Error(`Unknown attribut <${attrName}> in attribute <${attribute.name}> of object <${object.name}>`);
					break;
			}
		}
		if (attribute.name === null)
			throw new Error(`Name of attribute n°${iAttribute} of object <${object.name}> is not defined`);
		if (attribute.value === null)
			throw new Error(`Value of attribute <${attribute.name}> of object <${object.name}> is not defined`);
		if (object.attributes[attribute.name] !== undefined)
			throw new Error(`Attribute <${attribute.name}> of object <${object.name}> already exists`);
		object.attributes[attribute.name] = attribute.value;
	}
}

function loadIndexName(index, name) {
	if (index.name !== null)
		throw new Error(`Object index name already defined`);
	name = name.trim();
	if (name.length === 0)
		throw new Error(`Object index name is empty`);
	index.name = name;
}

function loadIndexUnicity(index, value) {
	if (index.unique !== null)
		throw new Error(`Object index unicity already defined`);
	if (value !== true && value !== false)
		throw new Error(`Unicity of  is not a boolean`);
	index.unique = value;
}

function loadIndexKeyType(indexKey, keyType, keyRef) {
	const index = indexKey.index;
	const object = index.object;
	if (indexKey.type !== null)
		throw new Error(`Key n°${indexKey.position} of index <${index.name}> of object <${object.name}> already defined`);
	assert.ok(indexKey.reference === null);
	if (keyRef.trim === undefined)
		throw new Error(`Type of key n°${indexKey.position} of index <${index.name}> of object <${object.name}> is not a string`);
	keyType = keyType.trim();
	keyRef= keyRef.trim();
	let reference = null;
	switch (keyType) {
		case 'property':
			reference = object.properties.find( (p) => p.name === keyRef )
			reference = (reference === undefined) ? null : reference;
			break;
		case 'link':
			reference = object.links.find( (l) => l.name === keyRef )
			reference = (reference === undefined) ? null : reference;
			break;
		default:
			throw new Error(`Type of key n°${indexKey.position} of index <${index.name}> of object <${object.name}> is not 'property' or 'link'`);
	}
	if (reference === null)
		throw new Error(`Invalid ${keyType} reference <${keyRef}> in key n°${indexKey.position} of index <${index.name}> of object <${object.name}> does not exist'`);
	indexKey.type = keyType;
	indexKey.reference = reference;
}

function loadIndexKeyList(index, keyListDefinition)
{
	if (keyListDefinition.length === undefined)
		throw new Error(`Key list of index ${index.name} of object ${index.object.name} is not an array`);
	let iKey = 0;
	for (let keyDefinition of keyListDefinition) {
		iKey++;
		let key = {
			index: index,
			position: iKey,
			type : null,
			reference : null
		};
		for (let attrName in keyDefinition) {
			let attrValue = keyDefinition[attrName];
			switch (attrName) {
				case 'link':
				case 'property':
					loadIndexKeyType(key, attrName, attrValue);
					break;
				default:
					throw new Error(`Unknown attribut <${attrName}> in index <${index.name}> of <${index.object.name}>`);
					break;
			}
		}
		index.keys.push(key);
	}
}

function loadObjectIndexList(object, indexListDefinition) {
	if (indexListDefinition.length === undefined)
		throw new Error(`Index list of object <${object.name}> is not an array`);
	let iIndex = 0;
	for (let indexDefinition of indexListDefinition) {
		iIndex++;
		let index = {
			_type: 'object-index',
			position: iIndex,
			name : null,
			unique: null,
			keys: [],
			object: object
		};

		for (let attrName in indexDefinition) {
			let attrValue = indexDefinition[attrName];
			switch (attrName) {
				case 'name':
					loadIndexName(index, attrValue);
					break;
				case 'unique':
					loadIndexUnicity(index, attrValue);
					break;
				case 'keys':
					loadIndexKeyList(index, attrValue);
					break;
				default:
					throw new Error(`Unknown attribut <${attrName}> in  index n°${index.position}> of object <${object.name}>`);
					break;
			}
		}
		// TODO check if another index with the same name already exists
		if (index.name === null)
			throw new Error(`Name of index n°${iIndex} of object <${object.name}> is not defined`);
		if (index.unique === null)
			index.unique = true;
		if (index.keys.length === 0)
			throw new Error(`No keys are defined in index <${index.name}> of object <${index.object.name}>`);
		object.indexes.push(index);
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
			_type : 'object',
			name: null,
			properties: [],
			links : [],
			reverseLinks: [],
			attributes: {},
			indexes: [],
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
				case 'attributes':
					loadObjectAttributeList(object, attrValue);
					break;
				case 'indexes': // indexes loading are loaded in second step
				case 'links':   // links loading are loaded in second step
					break;
				default:
					throw new Error(`Unknown attribut <${attrName}> in object <${object.name}>`);
					break;
			}
		}
		if (object.name === null)
			throw new Error(`Name of object n°${iObject} is not defined`);
		if (object.properties.length === 0)
			throw new Error(`Property list of object <${object.name}> is empty`);
		// attribute list can be empty
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

function loadFileScope(file, scope) {
	if (file.scope !== null)
		throw new Error(`File scope already defined`);
	scope = scope.trim();
	if (scope.length === 0)
		throw new Error(`File scope is empty`);
	const scopeValidList = [ 'project', 'object' ];
	if (! scope in scopeValidList)
		throw new Error(`Invalid file scope <${scope}> (should be ${scopeValidList.join('/')})`);
	file.scope = scope;
}

function loadFileInput(file, inputFile) {
	if (file.input !== null)
		throw new Error(`File input already defined`);
	inputFile = inputFile.trim();
	if (inputFile.length === 0)
		throw new Error(`File inputFile is empty`);
	file.input = inputFile;
}

function loadFileOutput(file, outputFile) {
	if (file.output !== null)
		throw new Error(`File output already defined`);
	outputFile = outputFile.trim();
	if (outputFile.length === 0)
		throw new Error(`File outputFile is empty`);
	file.output = outputFile;
}

function loadProjectFileList(project, filesDefinition) {
	assert.ok(project !== undefined);
	assert.ok(filesDefinition !== undefined);
	if (filesDefinition.length === undefined)
		throw new Error(`File list is not an array`);
	if (project.files.length > 0)
		throw new Error(`Files list already loaded`);

	let iFile = 0;
	for (let fileDefinition of filesDefinition) {
		iFile++;
		let file = {
			_type : 'file',
			scope: null,
			input: null,
			output: null,
			project: project
		};

		for (let attrName in fileDefinition) {
			let attrValue = fileDefinition[attrName];
			switch (attrName) {
				case 'scope':
					loadFileScope(file, attrValue);
					break;
				case 'input':
					loadFileInput(file, attrValue);
					break;
				case 'output':
					loadFileOutput(file, attrValue);
					break;
				default:
					throw new Error(`Unknown attribut <${attrName}>`);
					break;
			}
		}
		if (file.scope === null)
			throw new Error(`Scope of file n°${iFile} is not defined`);
		if (file.input === null)
			throw new Error(`Input of file n°${iFile} is not defined`);
		if (file.output === null)
			throw new Error(`Output of file n°${iFile} is not defined`);
		project.files.push(file);
	}
}

function loadProjectAttributeName(attribute, name)
{
	if (attribute.name !== null) 
		throw new Error(`Name of attribute of project <${attribute.project.name}> already defined`);
	name = name.trim();
	if (name.length === 0)
		throw new Error(`Property name of project <${attribute.project.name}> is empty`);
	if (name.includes(' '))
		throw new Error(`Invalid attribute name <${name}> of object <${attribute.object.name}> is empty (spaces forbidden)`);
	attribute.name = name;
}

function loadProjectAttributeValue(attribute, value)
{
	if (attribute.value !== null) 
		throw new Error(`Value of attribute <${attribute.name}> of project <${attribute.project.name}> already defined`);
	value = value.trim();
	if (value.length === 0)
		throw new Error(`Value of attribute <${attribute.name}> of project <${attribute.project.name}> is empty`);
	attribute.value = value;
}


function loadProjectAttributeList(project, attributesDefinition) {
	if (attributesDefinition.length === undefined)
		throw new Error(`Attribute list of project <${project.name}> is not an array`);

	let iAttribute = 0;
	for (let attributeDefinition of attributesDefinition) {
		iAttribute++;
		let attribute = {
			_type : 'project-attribute',
			name : null,
			value: null,
			project: project
		};

		for (let attrName in attributeDefinition) {
			let attrValue = attributeDefinition[attrName];
			switch (attrName) {
				case 'name':
					loadProjectAttributeName(attribute, attrValue);
					break;
				case 'value':
					loadProjectAttributeValue(attribute, attrValue);
					break;
				default:
					// FIXME double use of attribute in the same error message
					throw new Error(`Unknown attribut <${attrName}> in attribute <${attribute.name}> of project <${project.name}>`);
					break;
			}
		}
		if (attribute.name === null)
			throw new Error(`Name of attribute n°${iAttribute} of project <${project.name}> is not defined`);
		if (attribute.value === null)
			throw new Error(`Value of attribute <${attribute.name}> of project <${project.name}> is not defined`);
		if (project.attributes[attribute.name] !== undefined)
			throw new Error(`Attribute <${attribute.name}> of project <${project.name}> already exists`);
		project.attributes[attribute.name] = attribute.value;
	}
}



function loadDataTypeName(dataType, name)
{
	if (dataType.name !== null) 
		throw new Error(`Name of dataType already defined`);
	name = name.trim();
	if (name.length === 0)
		throw new Error(`Data type name is empty`);
	if (name.includes(' '))
		throw new Error(`Invalid dataType name <${name}> is empty (spaces forbidden)`);
	dataType.name = name;
}

function loadDataTypeType(dataType, type)
{
	if (dataType.type !== null) 
		throw new Error(`Type of dataType <${dataType.name}> already defined`);
	type = type.trim();
	if (type.length === 0)
		throw new Error(`Type of dataType <${dataType.name}> is empty`);
	if (! type in ['enumeration'])
		throw new Error(`Invalid dataType <${dataType.name}>`);
	dataType.type= type;
}

function loadDataTypeValues(dataType, valuesDef)
{
	if (dataType.values !== null)
		throw new Error(`Values of dataType <${dataType.name}> already defined`);
	dataType.values = [];
	if (valuesDef.length === undefined)
		throw new Error(`Values of dataType <${dataType.name}> is not an array`);
	let iValue = 0;
	for (let valueDef of valuesDef){
		iValue;
		if (valueDef.value === undefined)
			throw new Error(`Values n°${iValue} of dataType <${dataType.name}> is not a value`);
		if (typeof(valueDef.value) !== 'string')
			throw new Error(`Values n°${iValue} of dataType <${dataType.name}> is not a string`);
		dataType.values.push(valueDef.value);
	}
}

function loadDataTypeList(project, dataTypesDefinition) {
	if (dataTypesDefinition.length === undefined)
		throw new Error(`DataType list of project <${project.name}> is not an array`);

	let iDataType = 0;
	for (let dataTypeDefinition of dataTypesDefinition) {
		iDataType++;
		let dataType = {
			_type : 'datatype',
			internal: false,
			name : null,
			type: null,
			values: null,
			project: project
		};

		for (let attrName in dataTypeDefinition) {
			let attrValue = dataTypeDefinition[attrName];
			switch (attrName) {
				case 'name':
					loadDataTypeName(dataType, attrValue);
					break;
				case 'type':
					loadDataTypeType(dataType, attrValue);
					break;
				case 'values':
					loadDataTypeValues(dataType, attrValue);
					break;
				default:
					// FIXME double use of dataType in the same error message
					throw new Error(`Unknown attribut <${attrName}> in dataType <${dataType.name}>`);
					break;
			}
		}
		if (dataType.name === null)
			throw new Error(`Name of dataType n°${iDataType} is not defined`);
		if (dataType.type === null)
			throw new Error(`Value of dataType <${dataType.name}> is not defined`);
		if (project.dataTypes.find( dt => dt.name === dataType.name) !== undefined)
			throw new Error(`DataType <${dataType.name}> already exists`);
		project.dataTypes.push(dataType);
	}
}



function loadProjectStep1(project, projectDefinition, verbose)
{
	for (let attrName in projectDefinition) {
		let attrValue = projectDefinition[attrName];
		switch (attrName) {
			case 'name':
				loadProjectName(project, attrValue);
				break;
			case 'datatypes':
				loadDataTypeList(project, attrValue);
				break;
			case 'attributes':
				loadProjectAttributeList(project, attrValue);
				break;
			case 'objects':
				loadProjectObjectList(project, attrValue);
				break;
			case 'files':
				loadProjectFileList(project, attrValue);
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
	let link = {
		_type: 'object-link',
		name: null,
		source: projectObject,
		target: null,
		mandatory: null,
		object: projectObject
	}
	for (let attrName in linkDef) {
		let attrValue = linkDef[attrName];
		switch (attrName) {
			case 'name':
				loadLinkName(link, attrValue);
				break;
			case 'target':
				loadLinkTarget(link, attrValue);
				break;
			case 'mandatory':
				loadLinkMandatory(link, attrValue);
				break;
			default:
				throw new Error(`Unknown attribut <${attrName} in link definition>`);
				break;
		}
	}
	if (link.name === null)
		throw new Error(`Link target is not defined`);
	if (link.target=== null)
		throw new Error(`Target of link <${link.name}> is not defined`);
	if (link.mandatory === null)
		link.mandatory = true;
	projectObject.links.push(link);
	link.target.reverseLinks.push(link);
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
			throw new Error(`Link list of object <${object.name}> is not an array`);

		for (let linkDef of linkListDef) 
			loadLink(projectObject, linkDef, verbose);
	}
}

function loadProjectStep3(project, projectDefinition, verbose)
{
	for (let objectDef of projectDefinition.objects) {
		let projectObject = project.objects.find( (obj) => obj.name === objectDef.name );
		assert.ok(projectObject !== undefined);

		let indexListDef = objectDef.indexes;
		if (indexListDef === undefined)
			continue;
		if (indexListDef.length === undefined)
			throw new Error(`Index list of object <${object.name}> is not an array`);

		loadObjectIndexList(projectObject, indexListDef);
	}
}

function dumpProject(project)
{
	function tab(n) {
		return ' '.repeat(n);
	}
	console.log(`\nProject <${project.name}> :`);

	console.log(`\nAttributes : x${project.attributes.length}`);
	for (let attributeName in project.attributes )  {
		let attributeValue = project.attributes[attributeName];
		console.log(`${tab(6)}- Attribut <${attributeName}> = <${attributeValue}>`);
	}

	console.log(`\nData types : x${project.dataTypes.length}`);
	for (let dataType of project.dataTypes )  {
		if (dataType.internal)
			continue;
		console.log(`${tab(6)}- Data type ${dataType.type} <${dataType.name}>`);
		if (dataType.type === 'enumeration') 
			for (let value of dataType.values)
				console.log(`${tab(10)}- <${value}>`);
	}


	console.log(`\nObjects : x${project.objects.length}`);
	for (let projectObject of project.objects) {
		console.log(`\n${tab(2)}- Object <${projectObject.name}> :`);

		console.log(`${tab(2)}  Attributes : `); // TODO ${projectObject.attributes.keys().length}`);
		for (let attributeName in projectObject.attributes )  {
			let attributeValue = projectObject.attributes[attributeName];
			console.log(`${tab(6)}- Attribut <${attributeName}> = <${attributeValue}>`);
		}

		console.log(`${tab(2)}  Properties : x${projectObject.properties.length}`);
		for (let property of projectObject.properties) 
			console.log(`${tab(6)}- Property <${property.name}> (type:${property.type.name}, mandatory:${property.mandatory})`);

		console.log(`${tab(2)}  Links : x${projectObject.links.length}`);
		for (let objectLink of projectObject.links )
			console.log(`${tab(6)}- Link <${objectLink.name}> (target:${objectLink.target.name}, mandatory:${objectLink.mandatory})`);

		console.log(`${tab(2)}  Indexes : x${projectObject.indexes.length}`);
		for (let index of projectObject.indexes ) {
			console.log(`${tab(6)}- Index <${index.name}> (unique:${index.unique}) :`);
			const keyCount = index.keys.length;
			for (let key of index.keys)
				console.log(`${tab(8)}- Key n°${key.position}/${keyCount} : ${key.type} <${key.reference.name}>`);
		}
	}

	console.log(`\nFiles : x${project.files.length}`);
	let iFile = 1;
	for (let file of project.files) {
		console.log(`${tab(2)}- File n°${iFile++} (scope <${file.scope}>)`);
		console.log(`${tab(2)}   - Input : <${file.input}>)`);
		console.log(`${tab(2)}   - Output : <${file.output}>)`);
	}
	console.log('');
}

function loadProject(projectDefinition, verbose)
{
	let project = {
		_type: 'project',
		name : null,
		attributes: [],
		dataTypes : internalDataTypes,
		objects : [],
		files : [],
	};
	loadProjectStep1(project, projectDefinition, verbose);
	loadProjectStep2(project, projectDefinition, verbose);
	loadProjectStep3(project, projectDefinition, verbose);
	if (verbose)
		dumpProject(project);
	return project;
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

	if (verbose)
		console.log(`${programName} V${version.major}.${version.minor}.${version.revision}`);

	let projectFile = program.args[0];
	if (projectFile === undefined) {
		console.error(`Error : project file argument required!`);
		process.exit(1);
	}

	// read project file
	let projectDef = null;
	try {
  		projectDef = yaml.load(fs.readFileSync(projectFile, 'utf8'));
	}
	catch (error) {
		console.error(`Error : Can't read project file <${error}> !`);
		process.exit(1);
	}

	// control project validity
	let project = null;
	try {
		project = loadProject(projectDef, verbose);
	}
	catch (error) {
		console.error(`Error : ${error.message} in project file <${projectFile}> !`);
		process.exit(1);
	}

	try {
		await generateFiles(project, verbose)
	}
	catch (error) {
		console.error(`Error : ${error.message} in project file <${projectFile}> !`);
		process.exit(1);
	}

	console.log('End.');
}

main();
