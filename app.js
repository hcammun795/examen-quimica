// CONFIGURACIÓN SUPABASE (Sustituye por tus claves reales)
const supabaseUrl = 'https://uiletyxxsmsxwjvnfziu.supabase.co/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpbGV0eXh4c21zeHdqdm5meml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTM1NzUsImV4cCI6MjA5Mzg4OTU3NX0.d-QGKtt6IQxwfKRw7rEhFF3VGF_x9xIgf_2k4jkSIAk';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let compuestoActual = null;
let columnaObjetivo = "";

// 1. GESTIÓN DE ACCESO
async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    
    if (error) alert("Error: " + error.message);
    else iniciarExamen(data.user.email);
}

function iniciarExamen(email) {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('exam-section').classList.remove('hidden');
    document.getElementById('user-email').innerText = email;
    nuevaPregunta();
}

async function logout() {
    await _supabase.auth.signOut();
    location.reload();
}

// 2. LÓGICA DEL EXAMEN
async function nuevaPregunta() {
    // Resetear UI
    document.getElementById('feedback').classList.add('hidden');
    document.getElementById('btn-comprobar').classList.remove('hidden');
    document.getElementById('btn-siguiente').classList.add('hidden');
    document.getElementById('respuesta-alumno').value = "";
    document.getElementById('respuesta-alumno').disabled = false;

    // Obtener un compuesto aleatorio
    const { data, error } = await _supabase.from('compuestos').select('*');
    if (data) {
        compuestoActual = data[Math.floor(Math.random() * data.length)];
        
        // Decidir qué preguntar (evitando columnas vacías)
        const columnasPosibles = [
            'formula', 'nombre_prefijos', 'nombre_num_oxi', 
            'nombre_ac_hidracidos', 'nombre_hidru_prog', 
            'nombre_tradicional', 'nombre_composicion'
        ].filter(col => compuestoActual[col] !== null && compuestoActual[col] !== "");

        // Elegimos una columna para mostrar y otra para preguntar
        const colPista = "formula"; 
        columnaObjetivo = columnasPosibles.filter(c => c !== colPista)[Math.floor(Math.random() * (columnasPosibles.length-1))];

        document.getElementById('instruccion').innerText = `Escribe el nombre en sistema: ${columnaObjetivo.replace('nombre_', '').replace('_', ' ')}`;
        document.getElementById('pregunta-display').innerText = compuestoActual[colPista];
    }
}

function comprobar() {
    const input = document.getElementById('respuesta-alumno').value.trim();
    const correcta = compuestoActual[columnaObjetivo];
    const feedbackDiv = document.getElementById('feedback');

    feedbackDiv.classList.remove('hidden');
    document.getElementById('btn-comprobar').classList.add('hidden');
    document.getElementById('btn-siguiente').classList.remove('hidden');
    document.getElementById('respuesta-alumno').disabled = true;

    // VALIDACIÓN ESTRICTA (Tildes, mayúsculas, espacios)
    if (input === correcta) {
        feedbackDiv.innerText = "¡CORRECTO! Impecable.";
        feedbackDiv.className = "feedback correct";
    } else {
        feedbackDiv.innerText = `INCORRECTO. La respuesta exacta era: ${correcta}`;
        feedbackDiv.className = "feedback incorrect";
    }
}
