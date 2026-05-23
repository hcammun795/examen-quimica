const supabaseUrl = 'https://uiletyxxsmsxwjvnfziu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpbGV0eXh4c21zeHdqdm5meml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTM1NzUsImV4cCI6MjA5Mzg4OTU3NX0.d-QGKtt6IQxwfKRw7rEhFF3VGF_x9xIgf_2k4jkSIAk';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);


/**
 * Carga las estadísticas desde la vista SQL, agrupa por alumno y genera las tarjetas
 */
async function cargarEstadisticas() {
    const contenedor = document.getElementById('contenedor-alumnos');
    contenedor.innerHTML = '<div class="mensaje-estado">Procesando registros de la vista...</div>';

    try {
        // LEER DE LA NUEVA VISTA OPTIMIZADA (Ahora incluye nombre_alumno)
        const { data, error } = await _supabase
            .from('vista_progreso_alumnos')
            .select('email_alumno, nombre_alumno, nombre_tema, total_intentos, total_aciertos, porcentaje_acierto');

        if (error) throw error;

        if (!data || data.length === 0) {
            contenedor.innerHTML = '<div class="mensaje-estado">Aún no hay datos registrados por los alumnos.</div>';
            return;
        }

        const alumnos = {};
        
        data.forEach(reg => {
            const email = reg.email_alumno;
            if (!email) return;

            // Si el alumno no está registrado en nuestro mapeo, lo inicializamos
            if (!alumnos[email]) {
                // Si el nombre viene vacío o null desde perfiles, usamos el email como plan B
                const nombreAMostrar = reg.nombre_alumno ? reg.nombre_alumno : email.split('@')[0];
                
                alumnos[email] = {
                    nombre: nombreAMostrar,
                    email: email,
                    temas: [],
                    totalIntentos: 0,
                    totalAciertos: 0
                };
            }

            alumnos[email].temas.push({
                tema: reg.nombre_tema || "Tema sin nombre",
                intentos: reg.total_intentos || 0,
                aciertos: reg.total_aciertos || 0,
                porcentaje: reg.porcentaje_acierto || 0
            });

            alumnos[email].totalIntentos += (reg.total_intentos || 0);
            alumnos[email].totalAciertos += (reg.total_aciertos || 0);
        });

        contenedor.innerHTML = ""; // Limpiar mensaje de carga

        // RENDERIZAR TARJETAS EN EL DOM
        for (const email in alumnos) {
            const info = alumnos[email];
            
            const rendimientoGlobal = info.totalIntentos > 0 
                ? ((info.totalAciertos / info.totalIntentos) * 100).toFixed(1) 
                : "0.0";

            const colorClase = rendimientoGlobal >= 70 ? 'alto' : 'bajo';
            
            // ID único basado en el email para el Canvas
            const canvasId = `chart-${email.replace(/[^a-zA-Z0-9]/g, '')}`;

            const tarjeta = document.createElement('div');
            tarjeta.className = 'tarjeta-alumno';
            tarjeta.innerHTML = `
                <h3>${info.nombre}</h3>
                <span class="email-sub">${info.email}</span>
                <div class="stats-globales">
                    <div class="stat-item">
                        <span class="stat-val">${info.totalIntentos}</span>
                        <span class="stat-label">Ejercicios</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-val ${colorClase}">${rendimientoGlobal}%</span>
                        <span class="stat-label">Acierto Global</span>
                    </div>
                </div>
                <div class="grafico-container">
                    <canvas id="${canvasId}"></canvas>
                </div>
            `;

            contenedor.appendChild(tarjeta);

            // Construir el gráfico para este Canvas específico
            construirGrafico(canvasId, info.temas);
        }

    } catch (err) {
        console.error("Error crítico en Dashboard:", err);
        contenedor.innerHTML = `<div class="mensaje-estado" style="color: #ef4444;">❌ Error al conectar con Supabase: ${err.message}</div>`;
    }
}

/**
 * Configura y dibuja el gráfico Chart.js para cada alumno
 */
function construirGrafico(canvasId, datosTemas) {
    const elemento = document.getElementById(canvasId);
    if (!elemento) return;

    const ctx = elemento.getContext('2d');
    const temasActivos = datosTemas.filter(t => t.intentos > 0);

    const etiquetas = temasActivos.map(t => t.tema);
    const porcentajes = temasActivos.map(t => t.porcentaje);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: etiquetas,
            datasets: [{
                label: '% Éxito',
                data: porcentajes,
                backgroundColor: 'rgba(79, 70, 229, 0.7)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 1,
                borderRadius: 5,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) { return value + "%"; }
                    }
                },
                x: {
                    ticks: {
                        font: { size: 10 },
                        maxRotation: 30,
                        minRotation: 0
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const index = context.dataIndex;
                            const objetoTema = temasActivos[index];
                            return ` Éxito: ${context.raw}% (${objetoTema.aciertos}/${objetoTema.intentos} aciertos)`;
                        }
                    }
                }
            }
        }
    });
}

// Disparador inicial automático al cargar la ventana
document.addEventListener("DOMContentLoaded", () => {
    if(SUPABASE_URL !== "https://TU_PROYECTO.supabase.co") {
        cargarEstadisticas();
    } else {
        document.getElementById('contenedor-alumnos').innerHTML = '<div class="mensaje-estado" style="color: #f59e0b;">⚠️ Configura primero las constantes SUPABASE_URL y SUPABASE_ANON_KEY dentro de profesor.js</div>';
    }
});
