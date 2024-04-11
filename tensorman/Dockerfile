FROM debian:bookworm-slim

RUN echo "deb http://deb.debian.org/debian bookworm main non-free" >> /etc/apt/sources.list && \
    apt-get update && \
    apt-get install -y python3 python3-venv python3-pip curl unrar libopenjp2-7 libxrender1 xvfb texlive-xetex texlive-fonts-recommended texlive-plain-generic && \
    rm -rf /var/lib/apt/lists/*

RUN useradd -ms /bin/bash jupyter

USER jupyter
WORKDIR /home/jupyter

COPY requirements.txt .

RUN python3 -m venv venv && \
    venv/bin/pip install --no-cache-dir -r requirements.txt && \
    venv/bin/pip install --no-cache-dir jupyterlab==3.5.2 nbconvert==7.2.7 pdf2image

# Switch to root to install Azure CLI
USER root
RUN curl -sL https://aka.ms/InstallAzureCLIDeb | bash

# Switch back to jupyter user
USER jupyter


COPY . .

# Set Jupyter Notebook password and disable token authentication
RUN venv/bin/jupyter notebook --generate-config && \
    #echo "c.NotebookApp.password = u'sha1:ce92e2c2727a:173dcd92a4965edfe23b1b21a7c3b103c8b50e8b'" >> /home/jupyter/.jupyter/jupyter_notebook_config.py && \
    #echo "c.NotebookApp.password_required = True" >> /home/jupyter/.jupyter/jupyter_notebook_config.py && \
    echo "c.NotebookApp.token = 'flyingai'" >> /home/jupyter/.jupyter/jupyter_notebook_config.py

EXPOSE 8888

# Run Jupyter Notebook directly from the virtual environment
CMD ["xvfb-run", "--auto-servernum", "--server-args='-ac -screen 0 1280x1024x24'", "venv/bin/jupyter", "notebook", "--ip=0.0.0.0", "--port=8888", "--no-browser", "--allow-root"]