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
// 1. Traductor de nombres técnicos a nombres legibles para el alumno
const traductorNombres = {
    'nombre_prefijos': 'Nomenclatura de Prefijos (Sistemática)',
    'nombre_num_oxi': 'Nomenclatura de Número de Oxidación (Stock)',
    'nombre_tradicional': 'Nomenclatura Tradicional',
    'nombre_ac_hidracidos': 'Ácido Hidrácido',
    'nombre_hidru_prog': 'Hidruro Progenitor',
    'nombre_composicion': 'Nomenclatura de Composición'
};

async function nuevaPregunta() {
    // RESETEAR INTERFAZ
    const feedback = document.getElementById('feedback');
    if (feedback) feedback.classList.add('hidden');
    
    document.getElementById('btn-siguiente').classList.add('hidden');
    document.getElementById('btn-comprobar').classList.remove('hidden');
    document.getElementById('respuesta-alumno').value = "";
    document.getElementById('respuesta-alumno').disabled = false;
    document.getElementById('pregunta-display').innerText = "Cargando...";

    try {
        // 1. CONSULTAR COMPUESTOS EN SUPABASE
        // Filtramos por los temas (tipo_id) seleccionados en la pantalla anterior
        const { data, error } = await _supabase
            .from('compuestos')
            .select('*')
            .in('tipo_id', tiposSeleccionados);

        if (error) throw error;

        // 2. VALIDACIÓN DE SEGURIDAD (Para evitar el error de "reading properties of null")
        if (!data || data.length === 0) {
            alert("No hay compuestos disponibles para los temas seleccionados. Avisa al profesor.");
            location.reload();
            return;
        }

        // 3. ELEGIR UN COMPUESTO AL AZAR
        compuestoActual = data[Math.floor(Math.random() * data.length)];

        // 4. ELEGIR QUÉ TIPO DE NOMENCLATURA PREGUNTAR
        // Filtramos solo las columnas que tengan texto en la base de datos
        const posiblesColumnas = Object.keys(traductorNombres).filter(col => 
            compuestoActual[col] && compuestoActual[col].trim() !== ""
        );

        if (posiblesColumnas.length === 0) {
            // Si el compuesto elegido no tiene ningún nombre relleno, buscamos otro
            console.warn("Compuesto sin nombres detectado, reintentando...");
            return nuevaPregunta();
        }

        // Elegimos una columna al azar de las disponibles
        columnaObjetivo = posiblesColumnas[Math.floor(Math.random() * posiblesColumnas.length)];
        
        // 5. ACTUALIZAR PANTALLA
        const nombreVisible = traductorNombres[columnaObjetivo];
        document.getElementById('instruccion').innerText = `Escribe el nombre: ${nombreVisible}`;
        
        // Mostramos la fórmula química (formateando subíndices como el 2 de H2O)
        document.getElementById('pregunta-display').innerHTML = formatearFormula(compuestoActual.formula);
        
        // Ponemos el foco en el input para que el alumno pueda escribir rápido
        document.getElementById('respuesta-alumno').focus();

    } catch (err) {
        console.error("Error en nuevaPregunta:", err);
        document.getElementById('pregunta-display').innerText = "Error al cargar pregunta";
    }
}

// Función auxiliar para que el texto H2O se vea como H₂O en el navegador
function formatearFormula(texto) {
    if (!texto) return "";
    return texto.replace(/\d+/g, (match) => `<sub>${match}</sub>`);
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
        // Dentro de la función comprobar() en app.js
        const { data: { user } } = await _supabase.auth.getUser();
        
        if (user) {
            // Usamos el NUEVO NOMBRE de la función
            const { error } = await _supabase.rpc('guardar_estadistica_alumno', { 
                p_email_alumno: user.email,
                p_tipo_id: parseInt(compuestoActual.tipo_id), 
                p_es_acierto: esCorrecto 
            });
        
            if (error) {
                console.error("Error al guardar:", error.message);
            } else {
                console.log("Estadística guardada con éxito.");
            }
        }

    } catch (e) {
        console.error("Error en el bloque catch:", e);
    }
}
