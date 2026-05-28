import { currentAuthUser } from './auth.js';

// Inputs do Forumlário
const inName = document.getElementById('cv-name');
const inTitle = document.getElementById('cv-title');
const inEmail = document.getElementById('cv-email');
const inPhone = document.getElementById('cv-phone');
const inSummary = document.getElementById('cv-summary');
const inSkills = document.getElementById('cv-skills');
const inLanguages = document.getElementById('cv-languages');
const inCourses = document.getElementById('cv-courses');
const inPhoto = document.getElementById('cv-photo-input');
const inExpRole = document.getElementById('cv-exp-role');
const inExpComp = document.getElementById('cv-exp-company');
const inExpTime = document.getElementById('cv-exp-time');
const inExp2Role = document.getElementById('cv-exp2-role');
const inExp2Comp = document.getElementById('cv-exp2-company');
const inExp2Time = document.getElementById('cv-exp2-time');
const inEduCourse = document.getElementById('cv-edu-course');
const inEduSchool = document.getElementById('cv-edu-school');
const inLinks = document.getElementById('cv-file');

// Outputs do Papel A4
const outName = document.getElementById('render-cv-name');
const outTitle = document.getElementById('render-cv-title');
const outEmail = document.getElementById('render-cv-email');
const outPhone = document.getElementById('render-cv-phone');
const outSummary = document.getElementById('render-cv-summary');
const outSkills = document.getElementById('render-cv-skills');
const outLanguages = document.getElementById('render-cv-languages');
const outCourses = document.getElementById('render-cv-courses');
const outPhoto = document.getElementById('render-cv-photo');
const secLanguages = document.getElementById('cv-section-languages');
const secCourses = document.getElementById('cv-section-courses');
const outExpRole = document.getElementById('render-cv-exp-role');
const outExpComp = document.getElementById('render-cv-exp-company');
const outExpTime = document.getElementById('render-cv-exp-time');
const outExp2Role = document.getElementById('render-cv-exp2-role');
const outExp2Comp = document.getElementById('render-cv-exp2-company');
const outExp2Time = document.getElementById('render-cv-exp2-time');
const secExp2 = document.getElementById('cv-section-exp2');
const outEduCourse = document.getElementById('render-cv-edu-course');
const outEduSchool = document.getElementById('render-cv-edu-school');
const outLinks = document.getElementById('render-cv-links');
const secLinks = document.getElementById('cv-section-links');

export function initResumeBuilder() {
    // Escuta tudo o que o usuário digita nos formulários e aplica imediatamente na folha A4
    const inputs = [inName, inTitle, inEmail, inPhone, inSummary, inSkills, inExpRole, inExpComp, inExpTime, inExp2Role, inExp2Comp, inExp2Time, inEduCourse, inEduSchool, inLanguages, inCourses, inLinks];
    
    inputs.forEach(input => {
        if (!input) return;
        input.addEventListener('input', () => {
            if (inName) outName.innerText = inName.value || 'Seu Nome Aqui';
            if (inTitle) outTitle.innerText = inTitle.value || 'Sua Profissão';
            if (inEmail) outEmail.innerText = inEmail.value || 'email@exemplo.com';
            if (inPhone) outPhone.innerText = inPhone.value || '(00) 00000-0000';
            if (inSummary) outSummary.innerText = inSummary.value || 'Seu texto de resumo aparecerá aqui e ganhará corpo.';
            if (inExpRole) outExpRole.innerText = inExpRole.value || 'Seu Cargo';
            if (inExpComp) outExpComp.innerText = inExpComp.value || 'Nome da Empresa';
            if (inExpTime) outExpTime.innerText = inExpTime.value || 'Período';
            if (inExp2Role) outExp2Role.innerText = inExp2Role.value || 'Outro Cargo';
            if (inExp2Comp) outExp2Comp.innerText = inExp2Comp.value || 'Outra Empresa';
            if (inExp2Time) outExp2Time.innerText = inExp2Time.value || 'Período';
            if (inEduCourse) outEduCourse.innerText = inEduCourse.value || 'Curso Acadêmico';
            if (inEduSchool) outEduSchool.innerText = inEduSchool.value || 'Nome da Instituição';
            
            if (inLinks && secLinks && outLinks) {
                if (inLinks.files && inLinks.files.length > 0) {
                    secLinks.style.display = 'block';
                    const file = inLinks.files[0];
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        outLinks.href = e.target.result;
                        outLinks.innerText = "Anexo: " + file.name;
                    };
                    reader.readAsDataURL(file);
                } else {
                    secLinks.style.display = 'none';
                    outLinks.href = "#";
                    outLinks.innerText = "";
                }
            }

            if (inExp2Role && secExp2) {
                if (inExp2Role.value.trim() !== '' || inExp2Comp.value.trim() !== '') {
                    secExp2.style.display = 'block';
                } else {
                    secExp2.style.display = 'none';
                }
            }
            
            // Skills requer mapear e criar mini blocos
            if (inSkills && outSkills) {
                outSkills.innerHTML = '';
                const skillsArr = inSkills.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                if (skillsArr.length === 0) {
                    outSkills.innerHTML = '<span class="cv-skill-item">Habilidade 1</span><span class="cv-skill-item">Habilidade 2</span>';
                } else {
                    skillsArr.forEach(sk => {
                        outSkills.innerHTML += `<span class="cv-skill-item">${sk}</span>`;
                    });
                }
            }
            if (inCourses && secCourses && outCourses) {
                if (inCourses.value.trim() !== '') {
                    secCourses.style.display = 'block';
                    outCourses.innerText = inCourses.value;
                } else {
                    secCourses.style.display = 'none';
                }
            }
            if (inLanguages && secLanguages && outLanguages) {
                if (inLanguages.value.trim() !== '') {
                    secLanguages.style.display = 'block';
                    outLanguages.innerText = inLanguages.value;
                } else {
                    secLanguages.style.display = 'none';
                }
            }
        });
    });

    if (inPhoto) {
        inPhoto.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = new Image();
                    img.src = ev.target.result;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX = 200;
                        let width = img.width;
                        let height = img.height;
                        if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } } 
                        else { if (height > MAX) { width *= MAX / height; height = MAX; } }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        if (outPhoto) {
                            outPhoto.src = canvas.toDataURL('image/jpeg', 0.9);
                            outPhoto.style.display = 'block';
                        }
                    };
                };
                reader.readAsDataURL(file);
            } else {
                if (outPhoto) {
                    outPhoto.style.display = 'none';
                    outPhoto.src = '';
                }
            }
        });
    }

    // Eventos de Ação (Baixar apenas local)
    const btnDown = document.getElementById('btn-download-pdf');

    if (btnDown) {
        btnDown.addEventListener('click', async () => {
            const el = document.getElementById('a4-resume-content');
            btnDown.innerText = "GERANDO...";
            try {
                const opt = {
                    margin:       0,
                    filename:     `Curriculo_${(inName && inName.value ? inName.value.split(' ')[0] : 'Hax')}.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2, useCORS: true, logging: false },
                    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
                };
                await window.html2pdf().set(opt).from(el).save();
            } catch (err) {
                console.error("Erro no PDF:", err);
                window.showToast ? window.showToast("Ocorreu um erro ao baixar o currículo. Verifique se as imagens são compatíveis.", 'error') : alert("Ocorreu um erro ao baixar o currículo.");
            } finally {
                btnDown.innerHTML = 'BAIXAR EM PDF <i class="fas fa-file-pdf"></i>';
            }
        });
    }
}
