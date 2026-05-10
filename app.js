// --- CONFIGURACIÓN SUPABASE ---
const supabaseUrl = 'https://uiletyxxsmsxwjvnfziu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpbGV0eXh4c21zeHdqdm5meml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTM1NzUsImV4cCI6MjA5Mzg4OTU3NX0.d-QGKtt6IQxwfKRw7rEhFF3VGF_x9xIgf_2k4jkSIAk';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let compuestoActual = null;
let columnaObjetivo = "";
let tiposSeleccionados = [];

/**
 * 1. GESTIÓN DE LOGIN Y PANTALLAS
 */

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        alert("Error de acceso: " + error.message);
    } else {
        document.getElementById('user-display').innerText = data.user.email;
        mostrarConfiguracion();
    }
}

async function mostrarConfiguracion() {
    // Referencias a los elementos
    const loginSec = document.getElementById('login-section');
    const configPan = document.getElementById('config-panel');
    const container = document.getElementById('lista-tipos');

    // Cambiar visibilidad
    loginSec.classList.add('hidden');
    configPan.classList.remove('hidden');
    
    container.innerHTML = "<i>Cargando temas disponibles...</i>";

    // Obtener temas de Supabase
    try {
        const { data, error } = await _supabase.from('tipos_compuestos').select('*');
        
        if (error) throw error;

        if (data && data.length > 0) {
            container.innerHTML = data.map(t => `
                <label style="display:flex; align-items:center; margin:10px 0; cursor:pointer; background:white; padding:8px; border-radius:5px; border:1px solid #eee;">
                    <input type="checkbox" class="tipo-check" value="${t.id}" checked style="width:18px; height:18px;">
                    <span style="margin-left:10px; font-weight:500;">${t.nombre}</span>
                </label>
            `).join('');
        } else {
            container.innerHTML = "<p>No hay temas creados en 'tipos_compuestos'.</p>";
        }
    } catch (err) {
        console.error("Error al cargar temas:", err);
        container.innerHTML = `<p style="color:red">Error de conexión: ${err.message}</p>`;
    }
}

function empezarExamen() {
    const checks = document.querySelectorAll('.tipo-check:checked');
    tiposSeleccionados = Array.from(checks).map(c => parseInt(c.value));
    
    if (tiposSeleccionados.length === 0) {
        alert("Selecciona al menos un tema.");
        return;
    }
    
    document.getElementById('config-panel').classList.add('hidden');
    document.getElementById('exam-section').classList.remove('hidden');
    nuevaPregunta();
}

/**
 * 2. LÓGICA DE PREGUNTAS
 */

async function nuevaPregunta() {
    // Resetear Interfaz
    const feedback = document.getElementById('feedback');
    feedback.classList.add('hidden');
    document.getElementById('btn-siguiente').classList.add('hidden');
    document.getElementById('btn-comprobar').classList.remove('hidden');
    document.getElementById('respuesta-alumno').value = "";
    document.getElementById('respuesta-alumno').disabled = false;
    document.getElementById('pregunta-display').innerText = "...";

    // Consultar compuesto aleatorio del tema elegido
    try {
        const { data, error } = await _supabase
            .from('compuestos')
            .select('*')
            .in('tipo_id', tiposSeleccionados);

        if (error || !data || data.length === 0) {
            alert("No se encontraron compuestos. Verifica la columna 'tipo_id'.");
            location.reload();
            return;
        }

        compuestoActual = data[Math.floor(Math.random() * data.length)];
        
        // Filtrar columnas que no estén vacías para preguntar
        const posibles = [
            'nombre_prefijos', 'nombre_num_oxi', 'nombre_tradicional', 
            'nombre_ac_hidracidos', 'nombre_hidru_prog', 'nombre_composicion'
        ].filter(col => compuestoActual[col] && compuestoActual[col].trim() !== "");

        columnaObjetivo = posibles[Math.floor(Math.random() * posibles.length)];
        
        // Instrucción visual
        const nombreSistema = columnaObjetivo.replace('nombre_', '').replace(/_/g, ' ');
        document.getElementById('instruccion').innerText = `Escribe el nombre (${nombreSistema})`;
        document.getElementById('pregunta-display').innerHTML = formatearFormula(compuestoActual.formula);
        document.getElementById('respuesta-alumno').focus();

    } catch (err) {
        console.error(err);
    }
}

/**
 * 3. VALIDACIÓN Y UTILIDADES
 */

function formatearFormula(texto) {
    if (!texto) return "";
    return texto.replace(/\d+/g, (match) => `<sub>${match}</sub>`);
}

function normalizar(texto) {
    if (!texto) return "";
    return texto.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita tildes
        .replace(/\s+/g, ' ') // Quita espacios dobles
        .trim();
}

async function comprobar() {
    const alumno = document.getElementById('respuesta-alumno').value;
    const correcta = compuestoActual[columnaObjetivo];
    const esCorrecto = normalizar(alumno) === normalizar(correcta);

    const feedback = document.getElementById('feedback');
    feedback.classList.remove('hidden');
    document.getElementById('btn-comprobar').classList.add('hidden');
    document.getElementById('btn-siguiente').classList.remove('hidden');
    document.getElementById('respuesta-alumno').disabled = true;

    if (esCorrecto) {
        feedback.innerHTML = "✅ ¡Correcto!";
        feedback.className = "feedback correct";
    } else {
        feedback.innerHTML = `❌ Incorrecto. Era: <b>${correcta}</b>`;
        feedback.className = "feedback incorrect";
    }

    // --- BLOQUE DE GUARDADO CORREGIDO ---
    try {
        // 1. Obtener sesión actual
        const { data: { session } } = await _supabase.auth.getSession();
        
        if (!session) {
            console.error("Sesión no encontrada");
            return;
        }

        const uid = session.user.id;
        const tid = compuestoActual.tipo_id;

        console.log(`Registrando para User: ${uid}, Tipo: ${tid}, Acierto: ${esCorrecto}`);

        // 2. Llamada a la función RPC con los nuevos nombres de parámetros
        const { error } = await _supabase.rpc('registrar_intento', { 
            p_user_id: uid, 
            p_tipo_id: tid, 
            p_es_acierto: esCorrecto 
        });

        if (error) {
            console.error("Error RPC:", error);
            // Esto te ayudará a ver el error real en pantalla mientras pruebas
            alert("Error al guardar: " + error.message);
        } else {
            console.log("Estadística actualizada con éxito.");
        }
    } catch (e) {
        console.error("Error en el bloque catch:", e);
    }
}
