import { execSync } from 'child_process';
import readline from 'readline';

console.log('========================================================');
console.log('🚀 Instalador Universal Multiplataforma');
console.log('========================================================\n');

try {
  const nodeVersion = process.version;
  console.log(`✅ Node.js Versión: ${nodeVersion}`);
  console.log('📦 Instalando dependencias necesarias con npm install...\n');

  execSync('npm install', { stdio: 'inherit' });

  console.log('\n========================================================');
  console.log('🎉 ¡Instalación completada correctamente!');
  console.log('========================================================\n');
  console.log('📋 Comandos para ejecutar la aplicación:');
  console.log('   • Modo Desarrollo:  npm run dev');
  console.log('   • Compilar (Build): npm run build');
  console.log('   • Previsualizar:    npm run preview\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('¿Deseas iniciar el servidor ahora mismo? (s/n): ', (answer) => {
    rl.close();
    if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'si') {
      console.log('\n🚀 Iniciando aplicación...\n');
      execSync('npm run dev', { stdio: 'inherit' });
    } else {
      console.log('\n👍 Puedes iniciar la app en cualquier momento con "npm run dev".\n');
    }
  });
} catch (error) {
  console.error('\n❌ Error durante la instalación o ejecución:', error.message);
  process.exit(1);
}
