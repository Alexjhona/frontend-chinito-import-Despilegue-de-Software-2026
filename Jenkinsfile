pipeline {
    agent any

    tools {
        nodejs 'NODEJS_HOME'
    }

    environment {
        PROJECT_KEY = 'frontend-chinito-import'
        PROJECT_NAME = 'frontend-chinito-import'
        REPO_URL = 'https://github.com/Alexjhona/frontend-chinito-import-Despilegue-de-Software-2026.git'
        CHROME_BIN = '/usr/bin/chromium'
        K6_VUS = '3'
        K6_DURATION = '15s'
        K6_REQUIRED = 'true'
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main',
                    credentialsId: 'github-token',
                    url: "${REPO_URL}"
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Test') {
            steps {
                sh 'npm run test:ci'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Install Playwright Browser') {
            steps {
                sh 'npx playwright install chromium ffmpeg'
            }
        }

        stage('Playwright E2E') {
            steps {
                sh 'npm run e2e:ci'
            }
        }

        stage('K6 Performance') {
            steps {
                sh 'npm run k6:ci'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('sonarqube') {
                    withCredentials([string(credentialsId: 'Sonarqube', variable: 'SONAR_TOKEN')]) {
                        sh '''
                            npx --yes sonar-scanner \
                            -Dsonar.projectKey=$PROJECT_KEY \
                            -Dsonar.projectName=$PROJECT_NAME \
                            -Dsonar.sources=src \
                            -Dsonar.tests=src \
                            -Dsonar.test.inclusions=**/*.spec.ts \
                            -Dsonar.coverage.exclusions=**/*.html,**/*.css,**/*.server.ts,src/main.ts,src/main.server.ts,src/app/app.config.ts,src/app/app.config.server.ts,src/app/business/ajustes/**,src/app/business/cliente/**,src/app/business/categoria/**,src/app/business/dashboard/**,src/app/business/edit/**,src/app/business/inicio/**,src/app/business/producto/**,src/app/business/proveedor/**,src/app/business/trabajador/**,src/app/business/venta/**,src/app/business/authentication/register/**,src/app/core/interceptors/auth.interceptor.ts,src/app/core/services/auth.service.ts,src/app/core/services/audit.service.ts,src/app/core/services/data-refresh.service.ts,src/app/core/services/public-content.service.ts,src/app/core/services/theme.service.ts,src/app/shared/components/header/** \
                            -Dsonar.cpd.exclusions=**/*.html,**/*.css,**/*.spec.ts,src/app/business/**,src/app/shared/components/** \
                            -Dsonar.javascript.lcov.reportPaths=coverage/ng-menu-dashboard/lcov.info \
                            -Dsonar.host.url=$SONAR_HOST_URL \
                            -Dsonar.token=$SONAR_TOKEN
                        '''
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    script {
                        def qg = waitForQualityGate abortPipeline: false
                        echo "Resultado Quality Gate: ${qg.status}"
                    }
                }
            }
        }

        stage('Archive Build') {
            steps {
                archiveArtifacts artifacts: 'dist/**', fingerprint: true
            }
        }
    }

    post {
        success {
            echo 'Pipeline frontend ejecutado correctamente.'
        }

        failure {
            echo 'Pipeline frontend falló. Revisar logs en Jenkins.'
        }

        always {
            archiveArtifacts artifacts: 'playwright-report/**,test-results/**', allowEmptyArchive: true, fingerprint: true
            junit testResults: 'test-results/e2e-junit.xml', allowEmptyResults: true
            cleanWs()
        }
    }
}
