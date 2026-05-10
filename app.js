// --- CONFIGURACIÓN SUPABASE ---
const supabaseUrl = 'https://uiletyxxsmsxwjvnfziu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpbGV0eXh4c21zeHdqdm5meml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTM1NzUsImV4cCI6MjA5Mzg4OTU3NX0.d-QGKtt6IQxwfKRw7rEhFF3VGF_x9xIgf_2k4jkSIAk';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let compuestoActual = null;
let columnaObjetivo = "";
let tiposSeleccionados = [];

// --- 1. LOGIN Y FLUJO INICIAL ---

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        alert("Error de acceso: " + error.message);
    } else {
        // Si el login es correcto, pasamos a la pantalla de configuración
        mostrarConfiguracion();
    }
}

async function mostrarConfiguracion() {
    console.log("Cambiando a pantalla de configuración...");
    
    // Obtenemos los elementos por sus IDs correctos
    const configPanel = document.getElementById('config-panel');
    const loginSection = document.getElementById('login-section');
    const container = document.getElementById('lista-tipos');

    // Verificación de seguridad para que no vuelva a dar pantalla blanca
    if (!configPanel || !container) {
        console.error("No se encontró el ID 'config-panel' o 'lista-tipos' en el HTML.");
        return;
    }

    // Ocultamos login y mostramos configuración
    loginSection.classList.add('hidden');
    configPanel.classList.remove('hidden');
    
    container.innerHTML = "<i>Cargando temas disponibles...</i>";

    try {
        // Pedimos los datos a Supabase
        const { data, error } = await _supabase.from('tipos_compuestos').select('*');
        
        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = "<p style='color:orange'>⚠️ No hay temas en la tabla 'tipos_compuestos'.</p>";
            return;
        }

        // Dibujamos la lista de checkboxes
        container.innerHTML = data.map(t => `
            <label style="display:block; margin:10px 0; cursor:pointer; background:#f4f4f4; padding:10px; border-radius:8px;">
                <input type="checkbox" class="tipo-check" value="${t.id}" checked> 
                <span style="margin-left:8px; font-weight:bold;">${t.nombre}</span>
            </label>
        `).join('');

    } catch (err) {
        console.error("Error al cargar temas:", err);
        container.innerHTML = `<p style="color:red">Error: ${err.message}</p>`;
    }
}

function empezarExamen() {
    const checks = document.querySelectorAll('.tipo-check:checked');
    tiposSeleccionados = Array.from(checks).map(c => parseInt(c.value));
    
    if (tiposSeleccionados.length === 0) {
        alert("Selecciona al menos un tema.");
        return;
    }
    
    // Ocultamos el panel de configuración (antes fallaba aquí si el ID era distinto)
    document.getElementById('config-panel').classList.add('hidden');
    document.getElementById('exam-section').classList.remove('hidden');
    nuevaPregunta();
}

// --- 2. LÓGICA DEL EXAMEN ---

async function nuevaPregunta() {
    // Limpiar interfaz
    document.getElementById('feedback').classList.add('hidden');
    document.getElementById('btn-siguiente').classList.add('hidden');
    document.getElementById('btn-comprobar').classList.remove('hidden');
    document.getElementById('respuesta-alumno').value = "";
    document.getElementById('respuesta-alumno').disabled = false;
    document.getElementById('pregunta-display').innerText = "Buscando compuesto...";

    // Buscamos compuestos que pertenezcan a los tipos seleccionados
    const { data, error } = await _supabase
        .from('compuestos')
        .select('*')
        .in('tipo_id', tiposSeleccionados);

    if (error || !data || data.length === 0) {
        alert("No hay compuestos disponibles para los temas seleccionados.");
        location.reload();
        return;
    }

    // Elegimos uno al azar
    compuestoActual = data[Math.floor(Math.random() * data.length)];
    
    // Decidimos qué columna vamos a preguntar (que no esté vacía)
    const columnasNombres = [
        'nombre_prefijos', 'nombre_num_oxi', 'nombre_tradicional', 
        'nombre_ac_hidracidos', 'nombre_hidru_prog', 'nombre_composicion'
    ];
    const opcionesValidas = columnasNombres.filter(col => compuestoActual[col] && compuestoActual[col] !== "");

    columnaObjetivo = opcionesValidas[Math.floor(Math.random() * opcionesValidas.length)];
    
    // Mostramos la pregunta
    const nombreSistema = columnaObjetivo.replace('nombre_', '').replace(/_/g, ' ');
    document.getElementById('instruccion').innerText = `Escribe el nombre en sistema: ${nombreSistema}`;
    document.getElementById('pregunta-display').innerHTML = formatearFormula(compuestoActual.formula);
}

// --- 3. VALIDACIÓN Y NORMALIZACIÓN ---

function formatearFormula(texto) {
    // Pone subíndices automáticamente a los números
    return texto.replace(/\d+/g, (match) => `<sub>${match}</sub>`);
}

function normalizar(texto) {
    // La clave: quita mayúsculas, tildes y espacios extra
    return texto.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/\s+/g, ' ') 
        .trim();
}

async function comprobar() {
    const alumno = document.getElementById('respuesta-alumno').value;
    const correcta = compuestoActual[columnaObjetivo];

    // Comparamos sin tildes ni espacios dobles
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
        feedback.innerHTML = `❌ Incorrecto<br><small>La respuesta exacta era: <b>${correcta}</b></small>`;
        feedback.className = "feedback incorrect";
    }

    // Guardar estadística (requiere la función SQL 'registrar_intento' que hicimos antes)
    const { data: { user } } = await _supabase.auth.getUser();
    await _supabase.rpc('registrar_intento', { 
        arg_user_id: user.id, 
        arg_tipo_id: compuestoActual.tipo_id, 
        es_acierto: esCorrecto 
    });
}
