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
        K6_REQUIRED = 'false'
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
