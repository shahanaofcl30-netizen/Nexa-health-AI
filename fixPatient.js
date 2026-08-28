const fs = require('fs');

const file = 'backend/src/routes/appointment.routes.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `const newPatient = {
      id: uuidv4(),
      mrn: \`MRN-\${Math.floor(Math.random() * 90000) + 10000}\`,
      firstName: parts[0],
      lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
      dateOfBirth: '1990-01-01', // Default required field
      gender: 'other',
      contactNumber: '',
      email: '',
      address: '',
      bloodGroup: 'O+',
      emergencyContactName: '',
      emergencyContactNumber: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };`;

const replacement = `const newPatient = {
      id: uuidv4(),
      mrn: \`MRN-\${Math.floor(Math.random() * 90000) + 10000}\`,
      firstName: parts[0],
      lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
      dateOfBirth: '1990-01-01', // Default required field
      gender: 'other',
      phone: '',
      email: '',
      address: '',
      bloodGroup: 'O+',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelation: '',
      allergies: [],
      chronicConditions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('Fixed patient');
