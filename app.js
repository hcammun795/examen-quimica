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
    // 1. Limpiar interfaz
    const feedback = document.getElementById('feedback');
    if (feedback) feedback.classList.add('hidden');
    
    document.getElementById('btn-siguiente').classList.add('hidden');
    document.getElementById('btn-comprobar').classList.remove('hidden');
    document.getElementById('respuesta-alumno').value = "";
    document.getElementById('respuesta-alumno').disabled = false;
    document.getElementById('pregunta-display').innerText = "Cargando...";

    try {
        // 2. Obtener compuestos de Supabase
        const { data, error } = await _supabase
            .from('compuestos')
            .select('*')
            .in('tipo_id', tiposSeleccionados);

        if (error) throw error;
        if (!data || data.length === 0) {
            alert("No hay compuestos para estos temas.");
            location.reload();
            return;
        }

        // 3. Seleccionar compuesto al azar
        compuestoActual = data[Math.floor(Math.random() * data.length)];

        // 4. Decidir el SENTIDO de la pregunta (50% probabilidad cada uno)
        const modoFormula = Math.random() < 0.5; 

        // Buscar qué columnas de nombre tienen contenido
        const posiblesNombres = Object.keys(traductorNombres).filter(col => 
            compuestoActual[col] && compuestoActual[col].trim() !== ""
        );

        if (posiblesNombres.length === 0) return nuevaPregunta();
        columnaObjetivo = posiblesNombres[Math.floor(Math.random() * posiblesNombres.length)];

        if (modoFormula) {
            // MODO: Te doy el NOMBRE, me das la FÓRMULA
            const nombrePregunta = compuestoActual[columnaObjetivo];
            const tipoNomenclatura = traductorNombres[columnaObjetivo];
            
            document.getElementById('instruccion').innerText = `Escribe la FÓRMULA para:`;
            document.getElementById('pregunta-display').innerHTML = `<span style="font-size: 1.5rem;">${nombrePregunta}</span><br><small style="font-size: 0.9rem; color: #666;">(${tipoNomenclatura})</small>`;
            
            // Guardamos que la respuesta correcta ahora es la fórmula
            // Usamos una variable global o propiedad para saber qué comparar luego
            compuestoActual.esModoFormula = true; 
        } else {
            // MODO: Te doy la FÓRMULA, me das el NOMBRE (Como antes)
            const tipoNomenclatura = traductorNombres[columnaObjetivo];
            
            document.getElementById('instruccion').innerText = `Escribe el nombre (${tipoNomenclatura}):`;
            document.getElementById('pregunta-display').innerHTML = formatearFormula(compuestoActual.formula);
            
            compuestoActual.esModoFormula = false;
        }

        document.getElementById('respuesta-alumno').focus();

    } catch (err) {
        console.error("Error:", err);
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
    const inputAlumno = document.getElementById('respuesta-alumno');
    const feedback = document.getElementById('feedback');
    const btnComprobar = document.getElementById('btn-comprobar');
    const btnSiguiente = document.getElementById('btn-siguiente');
    
    let respuestaAlumno = inputAlumno.value.trim();
    let respuestaCorrecta = "";
    let esCorrecto = false;

    // 1. DETERMINAR QUÉ ESTAMOS EVALUANDO
    if (compuestoActual.esModoFormula) {
        const rawDB = compuestoActual.formula;
        const rawAlumno = respuestaAlumno;
    
        // Función que limpia CUALQUIER carácter raro basándose en su número ASCII
        const limpiezaProvisional = (str) => {
            return str.split('').filter(char => {
                const code = char.charCodeAt(0);
                // Solo permitimos: 
                // Números (48-57), Letras Mayus (65-90), Letras Minus (97-122), 
                // Paréntesis (40-41) y Signos + (43) o - (45)
                return (code >= 48 && code <= 57) || 
                       (code >= 65 && code <= 90) || 
                       (code >= 97 && code <= 122) ||
                       (code === 40 || code === 41 || code === 43 || code === 45);
            }).join('').toUpperCase();
        };
    
        const formulaDB = limpiezaProvisional(rawDB);
        const formulaAlumno = limpiezaProvisional(rawAlumno);
    
        console.log(`COMPARACIÓN FINAL: [${formulaAlumno}] vs [${formulaDB}]`);
        
        esCorrecto = (formulaAlumno === formulaDB);
    } else {
        // MODO NOMBRE: Usamos la normalización (sin tildes, etc.)
        respuestaCorrecta = compuestoActual[columnaObjetivo];
        esCorrecto = normalizar(respuestaAlumno) === normalizar(respuestaCorrecta);
    }

    if (compuestoActual.esModoFormula) {
        respuestaCorrecta = compuestoActual.formula.trim();
        
        // ESTO TE DIRÁ EL ERROR EN LA CONSOLA (F12)
        console.log("Alumno escribió:", respuestaAlumno.toUpperCase());
        console.log("Base de datos tiene:", respuestaCorrecta.toUpperCase());
    
        esCorrecto = respuestaAlumno.toUpperCase() === respuestaCorrecta.toUpperCase();
    }

    // 2. MOSTRAR RESULTADO VISUAL
    feedback.classList.remove('hidden');
    inputAlumno.disabled = true;
    btnComprobar.classList.add('hidden');
    btnSiguiente.classList.remove('hidden');

    if (esCorrecto) {
        feedback.innerHTML = "✅ ¡CORRECTO!";
        feedback.className = "feedback correct";
    } else {
        // Si es modo fórmula, mostramos la fórmula bonita con subíndices
        let solucionVisual = compuestoActual.esModoFormula ? 
            formatearFormula(respuestaCorrecta) : 
            respuestaCorrecta;
            
        feedback.innerHTML = `❌ INCORRECTO<br><small>La respuesta era: <b>${solucionVisual}</b></small>`;
        feedback.className = "feedback incorrect";
    }

    // 3. GUARDAR ESTADÍSTICAS
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        if (session) {
            await _supabase.rpc('guardar_estadistica_alumno', { 
                p_email_alumno: session.user.email.toLowerCase().trim(),
                p_tipo_id: parseInt(compuestoActual.tipo_id), 
                p_es_acierto: esCorrecto 
            });
        }
    } catch (e) {
        console.error("Error al guardar:", e);
    }
}

/** * FUNCIÓN AUXILIAR DE NORMALIZACIÓN
 * (Asegúrate de tenerla en tu app.js para que 'comprobar' funcione)
 */
function normalizar(texto) {
    if (!texto) return "";
    return texto.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita tildes
        .replace(/\s+/g, ' ') // Quita espacios dobles
        .trim();
}
